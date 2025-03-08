import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Animated, Dimensions, TouchableOpacity } from "react-native";
import tw from "twrnc";
import LottieView from "lottie-react-native";
import * as Animatable from "react-native-animatable";
import { ScoreRound } from "@/app/models/interfaces";

// Get screen dimensions
const { width, height } = Dimensions.get("window");

interface WinnerModalProps {
  visible: boolean;
  winner: ScoreRound | null;
  onAnimationEnd: () => void;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ visible, winner, onAnimationEnd }) => {
  const medalAnimation = useRef<LottieView>(null);
  const confettiAnimation = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [animationComplete, setAnimationComplete] = useState(false);
  
  useEffect(() => {
    if (visible) {
      // Play the animations
      if (medalAnimation.current) {
        medalAnimation.current.play();
      }
      if (confettiAnimation.current) {
        confettiAnimation.current.play();
      }
      
      // Animate the text
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.delay(3500), // Give time for animations to play
      ]).start(() => {
        setAnimationComplete(true);
        // Don't automatically proceed - let user tap to continue
      });
    } else {
      // Reset animations for next time
      fadeAnim.setValue(0);
      setAnimationComplete(false);
    }
  }, [visible]);

  if (!winner) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" >
      <TouchableOpacity 
        activeOpacity={1}
        style={tw`flex-1`} 
        onPress={animationComplete ? onAnimationEnd : undefined}
      >
        <View style={tw`flex-1 bg-black`}>
          {/* Confetti covering the entire screen */}
          <LottieView
            ref={confettiAnimation}
            source={require("@/assets/animations/confetiAnimation.json")}
            style={{
              position: 'absolute',
              width: width * 1.2, // Make it slightly larger than screen
              height: height * 1.2,
              left: -width * 0.1, // Center the enlarged animation
              top: -height * 0.1,
            }}
            autoPlay={false}
            loop={true}
            resizeMode="cover"
          />
          
          <View style={tw`flex-1 justify-center items-center`}>
            {/* Gold medal animation */}
            <LottieView
              ref={medalAnimation}
              source={require("@/assets/animations/GoldMedalAnimation.json")}
              style={tw`size-64`}
              autoPlay={false}
              loop={false}
            />
            
            {/* Winner text with animated entrance */}
            <Animated.View 
              style={[
                tw`items-center`, 
                { opacity: fadeAnim }
              ]}
            >
              <Text style={tw`text-yellow-400 text-xl font-bold mb-2`}>WINNER!</Text>
              <Animatable.Text
                animation={animationComplete ? "pulse" : undefined}
                iterationCount="infinite"
                style={tw`text-white text-4xl font-extrabold text-center`}
              >
                {winner.username}
              </Animatable.Text>
              
              <Animatable.Text
                animation="fadeIn"
                delay={1000}
                style={tw`text-yellow-400 text-2xl font-bold mt-4`}
              >
                {winner.points} points
              </Animatable.Text>
            </Animated.View>
            
            {/* "Tap anywhere" text positioned absolutely at the bottom of the screen */}
            {animationComplete && (
              <Animatable.View 
                animation="fadeIn" 
                style={tw`absolute bottom-12 w-full items-center`}
              >
                <Text style={tw`text-white text-lg opacity-70`}>
                  Tap anywhere to continue
                </Text>
              </Animatable.View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default WinnerModal;