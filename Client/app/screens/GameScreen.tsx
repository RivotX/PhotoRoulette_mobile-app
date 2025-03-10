import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StatusBar, FlatList, BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import tw from "twrnc";
import { useGameContext } from "../providers/GameContext";
import { Player, RandomPhotoResponse, ScoreRound } from "../models/interfaces";
import { usePhotoContext } from "../providers/PhotoContext";
import getEnvVars from "@/config";
import PhotoComponent from "@/app/components/PhotoComponent";
import { View as AnimatableView } from "react-native-animatable";
import ScoreModal from "@/app/components/modals/ScoreModal";
import ProgressBar from "@/app/components/ProgressBar";
import FinalScoreModal from "@/app/components/modals/FinalScoreModal";
import WinnerModal from "@/app/components/modals/WinnerModal";
import EmojiReaction from "@/app/components/IngameComunication/EmojiReaction";
import EmojisButton from "@/app/components/IngameComunication/EmojisButtons";

const { SERVER_URL } = getEnvVars();

// Define an interface for emoji reactions
interface EmojiReactionData {
  id: string;
  username: string;
  emoji: string;
}

// Available emojis

const GameScreen = () => {
  const { username, gameCode, endSocket, socket, playersProvider, roundsOfGame, plantedPhotoUri, uploadPlantedPhoto } =
    useGameContext();
  const safeUsername = username ?? "";
  const safeGameCode = gameCode ?? "";
  const [PhotoToShow, setPhotoToShow] = useState<string | null>(null);
  const [usernamePhoto, setUsernamePhoto] = useState<string | null>(null);
  const [round, setRound] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const { photoUri, getRandomPhoto, setPhotoUri } = usePhotoContext();
  const [myturn, setMyTurn] = useState<boolean>(false);
  const elementRef = useRef<AnimatableView>(null);
  const [userSelected, setUserSelected] = useState<string>("");
  const [showCorrectAnswer, setShowCorrectAnswer] = useState<boolean>(false);
  const [showScore, setShowScore] = useState<boolean>(false);
  const [score, setScore] = useState<ScoreRound[] | null>(null);
  const [finalScore, setFinalScore] = useState<ScoreRound[] | null>(null);
  const timeForAnswer = 6000; // 6 seconds
  const [progressKey, setProgressKey] = useState<number>(0);
  const [showFinalScore, setShowFinalScore] = useState<boolean>(false);
  const [showWinner, setShowWinner] = useState<boolean>(false);
  const [winner, setWinner] = useState<ScoreRound | null>(null);

  // New emoji reactions state
  const [emojiReactions, setEmojiReactions] = useState<EmojiReactionData[]>([]);

  // Add a state variable to track if we've uploaded the planted photo
  const [plantedPhotoUploaded, setPlantedPhotoUploaded] = useState<boolean>(false);

  // Function to upload an image to the server
  const uploadImage = async (uri: string) => {
    const formData = new FormData();
    formData.append("image", {
      uri,
      name: "photo.jpg",
      type: "image/jpeg",
    } as any);

    const response = await fetch(`${SERVER_URL}/upload`, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });

    const data = await response.json();
    return data.url;
  };

  // Function to remove emoji reaction after animation
  const removeEmojiReaction = (id: string) => {
    setEmojiReactions((current) => current.filter((reaction) => reaction.id !== id));
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        return true; // Prevents going back
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => {
        BackHandler.removeEventListener("hardwareBackPress", onBackPress);
      };
    }, [])
  );

  useEffect(() => {
    console.log("GameScreen mounted, socket", socket);
    console.log("players: ", playersProvider);

    if (socket) {
      socket.on("your-turn", async (data: { round: number }) => {
        console.log("My turn");
        setRound(data.round);
        setMyTurn(true);
        await getRandomPhoto();
      });

      socket.on("score-round", (data: ScoreRound[]) => {
        console.log("Score Round");
        console.log(data);
        setScore(data);
        setShowScore(true);
      });

      // Modify the photo-received socket handler
      socket.on("photo-received", (data: { photo: string; username: string; round: number; isPlanted?: boolean }) => {
        setScore(null);
        setShowCorrectAnswer(false);
        setUsernamePhoto("");
        setUserSelected("");
        console.log("Photo received from: " + data.username);
        setPhotoToShow(`${SERVER_URL}${data.photo}`);
        setUsernamePhoto(data.username);
        setRound(data.round);
        console.log("ronda: ", data.round, "recibida");
        setProgressKey((prevKey) => prevKey + 1);
        setTimeout(() => {
          setShowCorrectAnswer(true);
        }, timeForAnswer);
      });

      socket.on("game-over", (data: { finalScore: ScoreRound[] }) => {
        console.log("Game Over");
        console.log(data.finalScore);
        setFinalScore(data.finalScore);
        setGameOver(true);
        if (data.finalScore && data.finalScore.length > 0) {
          setShowScore(false);
          setWinner(data.finalScore[0]);
          setShowWinner(true);
        }
      });

      // Add the new emoji reaction listener
      socket.on("emoji-reaction", (data: { username: string; emoji: string }) => {
        const newReaction: EmojiReactionData = {
          id: `${Date.now()}-${Math.random()}`,
          username: data.username,
          emoji: data.emoji,
        };

        setEmojiReactions((current) => [...current, newReaction]);
      });

      setIsReady(true);
    }

    return () => {
      console.log("GameScreen unmounted");
      if (socket) {
        socket.off("your-turn");
        socket.off("photo-received");
        socket.off("emoji-reaction"); // Remove emoji reaction listener
        endSocket();
      }
    };
  }, [socket]);

  useEffect(() => {
    console.log("GAME OVER EN GAMESCREEN ES", gameOver);
  }, [gameOver]);

  useEffect(() => {
    const sendPhoto = async () => {
      if (photoUri && socket && myturn && round > 0) {
        setMyTurn(false);
        try {
          const photoUrl = await uploadImage(photoUri);
          console.log("Photo uploaded", photoUrl);
          console.log("ronda: ", round, "enviada");
          const randomPhotoResponse: RandomPhotoResponse = {
            photo: photoUrl,
            gameCode: safeGameCode,
            username: safeUsername,
            round: round,
          };

          socket.emit("photo-sent", randomPhotoResponse);
          setPhotoUri(null);
        } catch (error) {
          sendPhoto();
        }
      }
    };

    sendPhoto();
  }, [photoUri, myturn, round]);

  useEffect(() => {
    if (isReady && socket) {
      console.log("GameScreen is ready");
      console.log("Emitting im-ready");
      socket.emit("im-ready", { gameCode: safeGameCode, username: safeUsername });
    }
  }, [isReady]);

  useEffect(() => {
    if (showCorrectAnswer && usernamePhoto !== "" && socket) {
      console.log("Correct answer is: ", usernamePhoto, "User selected: ", userSelected);
      if (userSelected === usernamePhoto) {
        console.log("Correct Answer");
        socket.emit("correct-answer", {
          gameCode: safeGameCode,
          username: safeUsername,
          guess: userSelected,
        });
      } else {
        console.log("Incorrect Answer");
        socket.emit("incorrect-answer", {
          gameCode: safeGameCode,
          username: safeUsername,
          guess: userSelected,
        });
      }
    }
  }, [showCorrectAnswer]);

  // Add a new effect to handle plantedPhoto upload when the game starts
  useEffect(() => {
    const uploadPlantedPhotoIfNeeded = async () => {
      // Only upload if we have a plantedPhotoUri and haven't uploaded it yet
      if (plantedPhotoUri && !plantedPhotoUploaded && socket && gameCode) {
        try {
          const photoUrl = await uploadPlantedPhoto();
          if (photoUrl) {
            // Now tell the server about the planted photo
            socket.emit("plant-photo", {
              gameCode,
              username,
              photoUrl,
            });
            setPlantedPhotoUploaded(true);
          }
        } catch (error) {
          console.error("Failed to upload planted photo:", error);
        }
      }
    };

    uploadPlantedPhotoIfNeeded();
  }, [plantedPhotoUri, plantedPhotoUploaded, socket, gameCode, username]);

  const handleWinnerAnimationEnd = () => {
    setShowWinner(false);
    setShowFinalScore(true);
  };

  useEffect(() => {
    if (showWinner) {
      console.log("Winner is shown");
    }
  }, [showWinner]);

  useEffect(() => {
    if (userSelected !== "") {
      console.log("userSelected: ", userSelected);
    }
  }, [userSelected]);

  const renderPlayer = ({ item }: { item: Player }) => {
    const isPhotoOwner = item.username === usernamePhoto;
    const isAnswer = item.username === userSelected;
    const isCurrentUser = item.username === safeUsername;

    return (
      <TouchableOpacity
        style={tw`p-3 rounded-lg mb-2 mx-1 flex-grow flex-basis-[48%] ${
          showCorrectAnswer
            ? isPhotoOwner
              ? "bg-green-500"
              : isAnswer
                ? "bg-red-500"
                : "bg-gray-700"
            : isAnswer
              ? "bg-blue-500"
              : "bg-gray-700"
        }`}
        onPress={() => setUserSelected(item.username)}
        disabled={showCorrectAnswer}
      >
        <View style={tw`flex-row items-center justify-between`}>
          <Text
            style={tw`text-white text-base flex-1 ${isCurrentUser ? "font-bold" : ""}`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.username}
          </Text>
          {isCurrentUser && <Text style={tw`text-white text-xs bg-gray-600 px-1 py-0.5 rounded-full ml-1`}>You</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar hidden />
      <WinnerModal visible={showWinner} winner={winner} onAnimationEnd={handleWinnerAnimationEnd} />
      <FinalScoreModal visible={showFinalScore} finalScore={finalScore || []} />
      {/* Main Game Content */}
      <View style={tw`flex-1 bg-black`}>
        {PhotoToShow ? (
          <>
            <PhotoComponent photoUrl={PhotoToShow} />
            <View style={tw`absolute top-4 left-4 z-90`}>
              {emojiReactions.map((reaction) => (
                <EmojiReaction
                  key={reaction.id}
                  username={reaction.username}
                  emoji={reaction.emoji}
                  onAnimationEnd={() => removeEmojiReaction(reaction.id)}
                />
              ))}
            </View>
            <AnimatableView ref={elementRef} style={tw`z-8 absolute size-full`}>
              {/* Emoji reactions container */}

              <View style={tw`absolute size-full top-15 left-0 right-0 p-4`}>
                <ProgressBar key={progressKey} duration={timeForAnswer} />
              </View>

              {/* Players list */}
              <View style={tw`absolute z-40 bottom-22 left-0 right-0 p-2 flex-row justify-center`}>
                <FlatList
                  data={playersProvider}
                  renderItem={renderPlayer}
                  keyExtractor={(item) => item.socketId}
                  numColumns={2}
                  columnWrapperStyle={tw`justify-between`}
                  style={tw`w-full px-2`}
                  contentContainerStyle={tw`w-full`}
                />
              </View>

              <ScoreModal
                visible={showScore}
                onClose={() => setShowScore(false)}
                elementRef={elementRef}
                scoreRound={score || []}
                canHold={username == usernamePhoto}
                rounds={{ round: round, roundsOfGame: roundsOfGame }}
                photoUrl={PhotoToShow}
              />
            </AnimatableView>
            <EmojisButton />
          </>
        ) : (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-xl text-white font-bold mb-4`}>ARE YOU READY?</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default GameScreen;
