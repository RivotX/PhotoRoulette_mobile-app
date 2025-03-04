declare module 'react-native-animated-carousel';

export type RootStackParamList = {
  index: undefined;
  OwnPhotos: undefined;
  Online: undefined;
};

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}