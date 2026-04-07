import React from 'react';
import { motion } from 'framer-motion';

const FluidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#050505]">
      {/* Dynamic Blobs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
          backgroundColor: ["rgba(255, 77, 148, 0.15)", "rgba(123, 47, 190, 0.15)", "rgba(255, 77, 148, 0.15)"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full"
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 100, 0],
          scale: [1, 1.1, 1],
          backgroundColor: ["rgba(88, 28, 135, 0.15)", "rgba(15, 118, 110, 0.15)", "rgba(88, 28, 135, 0.15)"],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] blur-[150px] rounded-full"
      />
      {/* Aesthetic Cyan/Teal Blob (Grok Style) */}
      <motion.div
        animate={{
          x: [0, 120, 0],
          y: [0, -80, 0],
          scale: [1, 1.4, 1],
          backgroundColor: ["rgba(6, 182, 212, 0.1)", "rgba(2, 132, 199, 0.15)", "rgba(6, 182, 212, 0.1)"],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4
        }}
        className="absolute bottom-[10%] left-[20%] w-[50%] h-[40%] blur-[130px] rounded-full"
      />
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
          backgroundColor: ["rgba(255, 0, 102, 0.08)", "rgba(126, 34, 206, 0.08)", "rgba(255, 0, 102, 0.08)"],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5
        }}
        className="absolute top-[20%] right-[10%] w-[40%] h-[40%] blur-[100px] rounded-full"
      />

      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};

export default FluidBackground;
