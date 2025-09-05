declare global {
  interface Window {
    THREE: any;
    VANTA: {
      NET: (options: {
        el: string;
        mouseControls: boolean;
        touchControls: boolean;
        gyroControls: boolean;
        minHeight: number;
        minWidth: number;
        scale: number;
        scaleMobile: number;
        color: number;
        backgroundColor: number;
        points: number;
        maxDistance: number;
        spacing: number;
        showDots: boolean;
      }) => any;
    };
  }
}

export {};