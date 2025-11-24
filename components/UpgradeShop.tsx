
import React from 'react';
import { Stats, Upgrades } from '../types';
import { UPGRADE_BASE_COSTS } from '../constants';

interface UpgradeShopProps {
  stats: Stats;
  onUpgrade: (type: keyof Upgrades | 'repair') => void;
  onClose: () => void;
}

const UpgradeShop: React.FC<UpgradeShopProps> = ({ stats, onUpgrade, onClose }) => {
  
  // Linear Cost Logic: Base + (Level * 5)
  const getCost = (type: keyof Upgrades) => {
    return UPGRADE_BASE_COSTS[type] + (stats.upgrades[type] * 5);
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col p-1">
         
         {/* SciCon Card Structure */}
         <div className="scicon-border-container"></div>
         <div className="scicon-inner-bg"></div>
         
         {/* Nodes */}
         <div className="scicon-node node-tl-1"></div>
         <div className="scicon-node node-tl-2"></div>
         <div className="scicon-node node-tr-1"></div>
         <div className="scicon-node node-tr-2"></div>
         <div className="scicon-node node-bl-1"></div>
         <div className="scicon-node node-bl-2"></div>
         <div className="scicon-node node-br-1"></div>
         <div className="scicon-node node-br-2"></div>

         <div className="relative z-10 p-4 md:p-8 overflow-y-auto custom-scrollbar flex flex-col">
             <div className="flex justify-between items-center mb-4 md:mb-8 border-b border-gray-700 pb-2 md:pb-4 shrink-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white arcade-font tracking-widest text-shadow-neon">LABORATORY</h2>
                    <p className="text-indigo-400 text-[10px] md:text-xs font-mono uppercase mt-1 tracking-wider">Fund Research & Upgrades</p>
                </div>
                <div className="text-right">
                    <span className="text-gray-500 text-[10px] md:text-xs font-bold uppercase block mb-1">Grant Balance</span>
                    <div className="flex items-center justify-end gap-2">
                         <img src="https://www.researchhub.com/icons/gold2.svg" className="w-5 h-5 md:w-6 md:h-6" alt="RSC" />
                         <span className="text-2xl md:text-3xl font-bold text-white font-mono">{stats.coins}</span>
                    </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-8">
                
                {/* Fire Rate Upgrade */}
                <div className="bg-white/5 p-3 md:p-4 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-1 md:mb-2">
                        <div>
                            <h3 className="text-white font-bold text-xs md:text-sm uppercase tracking-wide">Rapid Review</h3>
                            <p className="text-gray-500 text-[10px] md:text-xs">Increases firing speed.</p>
                        </div>
                        <div className="text-xl md:text-2xl opacity-50">🔫</div>
                    </div>
                    
                    <div className="flex space-x-1 mb-2 md:mb-4 h-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`flex-1 rounded-sm ${i < stats.upgrades.fireRate ? 'bg-indigo-500' : 'bg-gray-800'}`}></div>
                        ))}
                    </div>

                    <button 
                        disabled={stats.coins < getCost('fireRate') || stats.upgrades.fireRate >= 5}
                        onClick={() => onUpgrade('fireRate')}
                        className={`w-full py-1.5 md:py-2 text-[10px] md:text-xs font-bold font-mono border rounded ${stats.coins >= getCost('fireRate') && stats.upgrades.fireRate < 5 ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500' : 'bg-transparent border-gray-700 text-gray-600 cursor-not-allowed'}`}
                    >
                        {stats.upgrades.fireRate >= 5 ? 'MAX LEVEL' : `FUND (${getCost('fireRate')} RSC)`}
                    </button>
                </div>

                {/* Speed Upgrade */}
                <div className="bg-white/5 p-3 md:p-4 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-1 md:mb-2">
                        <div>
                            <h3 className="text-white font-bold text-xs md:text-sm uppercase tracking-wide">Velocity Grant</h3>
                            <p className="text-gray-500 text-[10px] md:text-xs">Increases ship speed.</p>
                        </div>
                        <div className="text-xl md:text-2xl opacity-50">🚀</div>
                    </div>

                    <div className="flex space-x-1 mb-2 md:mb-4 h-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`flex-1 rounded-sm ${i < stats.upgrades.speed ? 'bg-purple-500' : 'bg-gray-800'}`}></div>
                        ))}
                    </div>

                    <button 
                        disabled={stats.coins < getCost('speed') || stats.upgrades.speed >= 5}
                        onClick={() => onUpgrade('speed')}
                        className={`w-full py-1.5 md:py-2 text-[10px] md:text-xs font-bold font-mono border rounded ${stats.coins >= getCost('speed') && stats.upgrades.speed < 5 ? 'bg-purple-600 border-purple-500 text-white hover:bg-purple-500' : 'bg-transparent border-gray-700 text-gray-600 cursor-not-allowed'}`}
                    >
                        {stats.upgrades.speed >= 5 ? 'MAX LEVEL' : `FUND (${getCost('speed')} RSC)`}
                    </button>
                </div>

                {/* HP Upgrade */}
                <div className="bg-white/5 p-3 md:p-4 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-1 md:mb-2">
                        <div>
                            <h3 className="text-white font-bold text-xs md:text-sm uppercase tracking-wide">Hull Reinforcement</h3>
                            <p className="text-gray-500 text-[10px] md:text-xs">Increases Max Lives.</p>
                        </div>
                        <div className="text-xl md:text-2xl opacity-50">🛡️</div>
                    </div>

                    <div className="flex space-x-1 mb-2 md:mb-4 h-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`flex-1 rounded-sm ${i < stats.upgrades.maxHp ? 'bg-green-500' : 'bg-gray-800'}`}></div>
                        ))}
                    </div>

                    <button 
                        disabled={stats.coins < getCost('maxHp') || stats.upgrades.maxHp >= 5}
                        onClick={() => onUpgrade('maxHp')}
                        className={`w-full py-1.5 md:py-2 text-[10px] md:text-xs font-bold font-mono border rounded ${stats.coins >= getCost('maxHp') && stats.upgrades.maxHp < 5 ? 'bg-green-600 border-green-500 text-white hover:bg-green-500' : 'bg-transparent border-gray-700 text-gray-600 cursor-not-allowed'}`}
                    >
                        {stats.upgrades.maxHp >= 5 ? 'MAX LEVEL' : `FUND (${getCost('maxHp')} RSC)`}
                    </button>
                </div>

                {/* REPAIR HULL */}
                <div className="bg-white/5 p-3 md:p-4 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-1 md:mb-2">
                        <div>
                            <h3 className="text-white font-bold text-xs md:text-sm uppercase tracking-wide">Emergency Aid</h3>
                            <p className="text-gray-500 text-[10px] md:text-xs">Recover 1 Life unit.</p>
                        </div>
                        <div className="text-xl md:text-2xl opacity-50">❤️</div>
                    </div>

                    <div className="flex space-x-1 mb-2 md:mb-4 h-1 bg-transparent"></div> {/* Spacer */}

                    <button 
                        disabled={stats.coins < UPGRADE_BASE_COSTS.repair || stats.lives >= (3 + stats.upgrades.maxHp)}
                        onClick={() => onUpgrade('repair')}
                        className={`w-full py-1.5 md:py-2 text-[10px] md:text-xs font-bold font-mono border rounded ${stats.coins >= UPGRADE_BASE_COSTS.repair && stats.lives < (3 + stats.upgrades.maxHp) ? 'bg-red-600 border-red-500 text-white hover:bg-red-500' : 'bg-transparent border-gray-700 text-gray-600 cursor-not-allowed'}`}
                    >
                        {stats.lives >= (3 + stats.upgrades.maxHp) ? 'FULL HEALTH' : `REPAIR (${UPGRADE_BASE_COSTS.repair} RSC)`}
                    </button>
                </div>

             </div>

             <button 
                onClick={onClose}
                className="scicon-btn w-full py-3 md:py-4 text-base md:text-lg font-bold tracking-widest shrink-0"
             >
                RETURN TO MISSION
             </button>
         </div>
      </div>
    </div>
  );
};

export default UpgradeShop;
