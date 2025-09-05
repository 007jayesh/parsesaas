"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface TextRotateProps {
  texts: string[];
  mainClassName?: string;
  staggerFrom?: "first" | "last";
  initial?: any;
  animate?: any;
  exit?: any;
  staggerDuration?: number;
  splitLevelClassName?: string;
  transition?: any;
  rotationInterval?: number;
}

export function TextRotate({
  texts,
  mainClassName = "",
  staggerFrom = "first",
  initial = { y: "100%" },
  animate = { y: 0 },
  exit = { y: "-120%" },
  staggerDuration = 0.025,
  splitLevelClassName = "",
  transition = { type: "spring", damping: 30, stiffness: 400 },
  rotationInterval = 2000,
}: TextRotateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [texts.length, rotationInterval]);

  const currentText = texts[currentIndex];

  return (
    <div className={`inline-flex ${mainClassName}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="flex"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {currentText.split("").map((char, index) => (
            <div key={index} className={splitLevelClassName}>
              <motion.span
                variants={{
                  hidden: initial,
                  visible: animate,
                  exit: exit,
                }}
                transition={{
                  ...transition,
                  delay: staggerFrom === "last" 
                    ? (currentText.length - 1 - index) * staggerDuration
                    : index * staggerDuration,
                }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}