import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  TouchableWithoutFeedback,
} from "react-native";
import tw from "twrnc";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import InitialScreen from "@/app/screens/InitialScreen";
import { useGameContext } from "@/app/providers/GameContext";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "react-native";
import * as Animatable from "react-native-animatable";
import ImageBlur from "@/app/components/ImageBlur/ImageBlur";
import { ImageBlurView } from "@/app/components/ImageBlur";
import { useBackHandler } from "@react-native-community/hooks";
import { useFocusEffect } from "@react-navigation/native";
import logo from "@/assets/images/icon.png";
import diceIcon from "@/assets/images/icon.png";
import { BackgroundProvider, useBackgroundContext } from "./providers/BackgroundContext";

// Animaciones personalizadas para React Native Animatable
Animatable.initializeRegistryWithDefinitions({
  slideInDownBounce: {
    0: {
      opacity: 0,
      translateY: -15,
    },
    0.6: {
      opacity: 1,
      translateY: 10,
    },
    0.75: {
      opacity: 1,
      translateY: -5,
    },
    0.9: {
      opacity: 1,
      translateY: 2,
    },
    1: {
      opacity: 1,
      translateY: 0,
    },
  },
  slideInUpBounce: {
    0: {
      opacity: 0,
      translateY: 15,
    },
    0.6: {
      opacity: 1,
      translateY: -10,
    },
    0.75: {
      opacity: 1,
      translateY: 5,
    },
    0.9: {
      opacity: 1,
      translateY: -2,
    },
    1: {
      opacity: 1,
      translateY: 0,
    },
  },
  slideOutUpBounce: {
    0: {
      opacity: 0,
      translateY: 0,
    },
    0.25: {
      opacity: 1,
      translateY: -10,
    },
    0.5: {
      opacity: 1,
      translateY: -5,
    },
    0.75: {
      opacity: 1,
      translateY: 5,
    },
    1: {
      opacity: 1,
      translateY: 0,
    },
  },
  slideOutDownBounce: {
    0: {
      opacity: 0,
      translateY: 0,
    },
    0.25: {
      opacity: 1,
      translateY: 10,
    },
    0.5: {
      opacity: 1,
      translateY: 5,
    },
    0.75: {
      opacity: 1,
      translateY: -5,
    },
    1: {
      opacity: 1,
      translateY: 0,
    },
  },
});

const Index = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const message = params?.message;
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenInitialScreen, setHasSeenInitialScreen] = useState(false);
  const { setUsername, username, setGameCode, gameCode, socket, endSocket } = useGameContext();
  const { backgroundImage } = useBackgroundContext();
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [shouldAnimateCreateGameButton, setShouldAnimateCreateGameButton] = useState(false);
  const [isFirstMount, setIsFirstMount] = useState(true);
  const gameCodeInputRef = useRef<TextInput>(null);
  const usernameInputRef = useRef<Animatable.View & View>(null);
  const gameCodeAnimRef = useRef<Animatable.View & View>(null);
  const createGameButtonRef = useRef<Animatable.View & View>(null);
  const JoingameButtonRef = useRef<Animatable.View & View>(null);

  // useEffect para cargar datos iniciales
  useEffect(() => {
    const checkInitialScreen = async () => {
      const value = await AsyncStorage.getItem("hasSeenInitialScreen");
      setHasSeenInitialScreen(value === "true");
      setIsLoading(false);
    };

    const loadUsername = async () => {
      const storedUsername = await AsyncStorage.getItem("username");
      if (storedUsername) {
        setUsername(storedUsername);
      }
    };

    checkInitialScreen();
    loadUsername();

    if (message) {
      alert(message);
    }
  }, []);

  // useFocusEffect para manejar el intervalo de cambio de fondo
  useFocusEffect(
    useCallback(() => {
      if (socket) {
        console.log("desconectando socket");
        endSocket();
      }
    }, [socket, endSocket])
  );

  // useEffect para manejar las animaciones cuando cambia el estado isJoiningGame
  useEffect(() => {
    if (!isJoiningGame && !isFirstMount) {
      console.log("RESET CREATE GAME BUTTON ANIMATION");
      setShouldAnimateCreateGameButton(true);
      (usernameInputRef.current as any)?.slideOutUpBounce?.(600);
      (JoingameButtonRef.current as any)?.slideOutDownBounce?.(600);
    }
    if (isFirstMount) {
      setIsFirstMount(false);
    }
  }, [isJoiningGame]);

  // Manejar el evento de retroceso en Android
  useBackHandler(() => {
    if (isJoiningGame) {
      handleCancelJoinGame();
      return true; // Prevenir el comportamiento por defecto (salir de la app)
    }
    return false; // Permitir el comportamiento por defecto
  });

  // Manejar el cambio de nombre de usuario
  const handleUsernameChange = async (text: string) => {
    setUsername(text);
    await AsyncStorage.setItem("username", text);
  };

  // Manejar la acción de unirse a un juego
  const handleJoinGame = () => {
    if (!username) {
      (usernameInputRef.current as any)?.shake?.(500);
      return;
    }

    setIsJoiningGame(true);
  };

  // Manejar la acción de crear un juego
  const handleCreateGame = () => {
    if (!username) {
      (usernameInputRef.current as any)?.shake?.(500);
      return;
    }
    setGameCode(null); // Limpiar el gameCode antes de navegar
    console.log("Navigating to WaitingRoom");
    router.push("/screens/WaitingRoom");
  };

  // Manejar la acción de buscar una sala
  const handleSearchRoom = () => {
    if (!gameCode) {
      (gameCodeAnimRef.current as any)?.shake?.(500);
      return;
    }
    router.push("/screens/WaitingRoom");
  };

  // Mostrar un indicador de carga si los datos iniciales aún se están cargando
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Mostrar la pantalla inicial si el usuario no la ha visto antes
  if (!hasSeenInitialScreen) {
    return <InitialScreen />;
  }

  // Manejar la acción de cancelar unirse a un juego
  const handleCancelJoinGame = () => {
    console.log("CANCEL JOIN GAME");
    setIsJoiningGame(false);
  };

  return (
    <>
      <View style={tw`absolute w-full h-full`}>
        <StatusBar hidden />
        {/* Fondo desenfocado */}
        <ImageBlur
          src={backgroundImage}
          blurRadius={3} // intensidad del blur
          blurChildren={<ImageBlurView style={{ height: "100%", width: "100%" }} />}
          style={{ flex: 1 }}
        />
      </View>
      <View style={tw`flex-1 justify-center items-center`}>
        {/* Logo en la parte superior */}
        <View style={tw`absolute top-[18%] w-full items-center`}>
          <Image source={logo} style={tw`w-20 h-20`} />
        </View>
        <View style={tw`px-2 flex-1 w-full justify-center items-center`}>
          {/* Mostrar el formulario de ingreso de usuario y botones si no se está uniendo a un juego */}
          {!isJoiningGame && (
            <>
              {/* Input para ingresar el nombre de usuario */}
              <Animatable.View
                ref={usernameInputRef}
                animation={shouldAnimateCreateGameButton ? "fadeIn" : undefined}
                duration={600}
                style={tw`w-full`}
              >
                <TextInput
                  style={tw`p-4 rounded-xl mb-4 w-full bg-white text-center text-lg font-bold`} 
                  placeholder="Enter username"
                  value={username || ""}
                  onChange={(e) => handleUsernameChange(e.nativeEvent.text)}
                />
              </Animatable.View>

              {/* Botón para crear un juego */}
              <Animatable.View
                ref={createGameButtonRef}
                animation={shouldAnimateCreateGameButton ? "fadeIn" : undefined}
                duration={600}
                style={tw`w-full`}
              >
                <TouchableOpacity style={tw`bg-orange-500 p-4 rounded-xl mb-4 w-full `} onPress={handleCreateGame}>
                  <Text style={tw`text-white text-center text-lg font-bold`}>Create Game</Text> 
                </TouchableOpacity>
              </Animatable.View>

              {/* Botón para unirse a un juego */}
              <Animatable.View
                ref={JoingameButtonRef}
                animation={shouldAnimateCreateGameButton ? "fadeIn" : undefined}
                duration={600}
                style={tw`w-full`}
              >
                <TouchableOpacity style={tw`bg-orange-500 p-4 rounded-xl mb-4 w-full `} onPress={handleJoinGame}>
                  <Text style={tw`text-white text-center text-lg font-bold`}>Join Game</Text> 
                </TouchableOpacity>
              </Animatable.View>
            </>
          )}

          {/* Mostrar el formulario de ingreso de código de juego si se está uniendo a un juego */}
          {isJoiningGame && (
            <TouchableWithoutFeedback onPress={handleCancelJoinGame}>
              <View style={tw`flex-1 w-full justify-center items-center`}>
                {/* Input para ingresar el código del juego */}
                <Animatable.View ref={gameCodeAnimRef} animation="slideInDownBounce" duration={600} style={tw`w-full`}>
                  <TextInput
                    ref={gameCodeInputRef}
                    style={tw`p-4 rounded-xl mb-4 w-full bg-white text-center text-lg font-bold`} 
                    placeholder="Enter game code"
                    value={gameCode || ""}
                    onChange={(e) => setGameCode(e.nativeEvent.text)}
                    autoCapitalize="characters"
                  />
                </Animatable.View>

                {/* Botón para buscar una sala */}
                <Animatable.View animation="slideInUpBounce" duration={600} style={tw`w-full`}>
                  <TouchableOpacity style={tw`bg-orange-500 p-4 rounded-xl mb-4 w-full `} onPress={handleSearchRoom}>
                    <Text style={tw`text-white text-center text-lg font-bold`}>Search Room</Text>
                  </TouchableOpacity>
                </Animatable.View>
              </View>
            </TouchableWithoutFeedback>
          )}
        </View>
        {/* Botón para navegar a la pantalla de fotos propias */}
        <TouchableOpacity
          style={tw`bg-white/50 p-4 rounded-3xl bottom-22 absolute items-center `}
          onPress={() => {
            console.log("Navigating to OwnPhotos");
            router.push("/screens/OwnPhotos");
          }}
        >
          <Image source={diceIcon} style={tw`w-8 h-8`} />
        </TouchableOpacity>
        <Text style={tw`absolute bottom-14 text-white text-lg font-bold`}>Random Photos</Text>
      </View>
    </>
  );
};

export default Index;