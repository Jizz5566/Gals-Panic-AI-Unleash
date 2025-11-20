import React from 'react';
import { RetroGame } from './components/RetroGame';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-retro-bg font-sans text-retro-text relative overflow-hidden flex flex-col">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[linear-gradient(0deg,transparent_24%,rgba(255,0,255,.3)_25%,rgba(255,0,255,.3)_26%,transparent_27%,transparent_74%,rgba(0,255,255,.3)_75%,rgba(0,255,255,.3)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(255,0,255,.3)_25%,rgba(255,0,255,.3)_26%,transparent_27%,transparent_74%,rgba(0,255,255,.3)_75%,rgba(0,255,255,.3)_76%,transparent_77%,transparent)] bg-[length:50px_50px]"></div>
        <div className="absolute top-0 left-0 w-full h-2 bg-retro-secondary shadow-[0_0_10px_#00ffff]"></div>
        <div className="absolute w-full h-full animate-scanline bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.2))] bg-[length:100%_4px] pointer-events-none"></div>
      </div>

      {/* Main Game Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center">
        <RetroGame />
      </main>

    </div>
  );
};

export default App;