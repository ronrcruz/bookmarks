// 'use client'

// import { useProgress } from '@react-three/drei';
// import { useState, useEffect } from 'react';

// export default function LoadingScreen({ onLoaded }: { onLoaded: () => void }) {
//   const [progress, setProgress] = useState(0);

//   // useEffect(() => {
//   //   const interval = setInterval(() => {
//   //     setProgress(prevProgress => {
//   //       if (prevProgress >= 99) {
//   //         clearInterval(interval);
//   //         setTimeout(() => onLoaded(), 1200);
//   //         return 100;
//   //       }

//   //       const baseIncrement = 5;
//   //       const dynamicIncrement = baseIncrement + Math.random() * (10 - baseIncrement);

//   //       return Math.min(prevProgress + dynamicIncrement, 100);
//   //     });
//   //   }, 200);

//   //   return () => clearInterval(interval);
//   // }, [onLoaded]);



//   return (
//     <div className={`cursor-none fixed inset-0 flex items-center justify-center bg-white z-50 flex-row gap-[17px] ${progress !== 100 ? "opacity-100" : "delay-700 opacity-0"} transition-opacity duration-1000`}>
//       {[...Array(10)].map((_, index) => {
//         const divOpacity = index < Math.floor((progress / 100) * 10) ? 1 : 0.1;

//         return (
//           <div
//             key={index}
//             className={`h-10 w-[1px] bg-black`}
//             style={{
//               opacity: divOpacity,
//               rotate: progress === 100 ? '50deg' : '0deg',
//               transition: 'opacity 1s ease-out, rotate 0.4s ease-out 0.5s',
//             }}
//           />
//         );
//       })}
//     </div>
//   );
// }

'use client'
import { useProgress } from '@react-three/drei';
import { useEffect } from 'react';

export default function LoadingScreen({ onLoaded }: { onLoaded: () => void }) {
  const { progress } = useProgress();

  // Calculate how many divs should be fully opaque based on progress
  const activeDivCount = Math.floor((progress / 100) * 11);

  useEffect(() => {
    if (progress === 100) {
      setTimeout(() => onLoaded(), 2000);
    }
  }, [progress, onLoaded, activeDivCount]);

  console.log(progress)

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-white z-50 flex-row gap-[17px] ${progress !== 100 ? "opacity-100" : "delay-1000 opacity-0"} transition-opacity duration-1000`}>
      {[...Array(11)].map((_, index) => (
        <div
          key={index}
          className="h-10 w-[1px] bg-black"
          style={{
            opacity: index < activeDivCount ? 1 : 0.1,
            rotate: progress === 100 ? '50deg' : '0deg',
            transition: 'opacity 1s ease-out, rotate 0.4s ease-out 0.5s',
          }}
        ></div>
      ))}
    </div>
  );
}