import { Composition, Still } from "remotion";
import { KinVaultPitch } from "./KinVaultPitch";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="KinVaultPitch"
        component={KinVaultPitch}
        durationInFrames={210 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ mode: "full" }}
      />
      <Composition
        id="KinVaultStinger"
        component={KinVaultPitch}
        durationInFrames={15 * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ mode: "stinger" }}
      />
      <Still
        id="KinVaultThumbnail"
        component={KinVaultPitch}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ mode: "thumbnail" }}
      />
    </>
  );
};
