/**
 * 文件: js/ui/controlsUI.js
 * 实现 处理各模式 (C·F·V) 的 UI 交互绑定。
 */

// 三个模式按钮的引用 (首次 setupUI 时缓存)
let btnModeC = null;
let btnModeF = null;
let btnModeV = null;
let modeButtonsInited = false;

/**
 * 根据当前模式同步三个模式按钮的 active 高亮
 * @param {string} currentMode - 'C' | 'F' | 'V'
 */
export function syncModeButtons(currentMode) {
  if (btnModeC) btnModeC.classList.toggle('active', currentMode === 'C');
  if (btnModeF) btnModeF.classList.toggle('active', currentMode === 'F');
  if (btnModeV) btnModeV.classList.toggle('active', currentMode === 'V');
}

export function setupUI(mode, deps, target) {
  const {
    setMode,
    stopAct,
    getCurrentMode,
    renderCIncremental,
    updateSliderState,
  } = deps;

  // 首次调用时缓存三个模式按钮引用 (只做一次)
  if (!modeButtonsInited) {
    btnModeC = document.getElementById('btn-mode-c');
    btnModeF = document.getElementById('btn-mode-f');
    btnModeV = document.getElementById('btn-mode-v');
    modeButtonsInited = true;
  }
  
  if (mode === 'C') {
    // ==========================================
    // C 模式：绑定切换按钮、滑块、±1 按钮
    // ==========================================
    const btnModeC = document.getElementById('btn-mode-c');
    const rangeC    = document.getElementById('range-c');
    const rangeCVal = document.getElementById('range-c-val');
    
    let sliderFrame = 0;

    // 强制切回 C (点击触发)
    btnModeC.addEventListener('click', () => {
      setMode('C');
    });

    const handleSliderChange = () => {
      if (getCurrentMode() !== 'C') return; 
      
      const sliderCount = parseInt(rangeC.value, 10);
      rangeCVal.textContent = String(sliderCount);
      
      stopAct();
      updateSliderState(sliderCount); 
      
      // 取消 待执行的动画帧
      if (sliderFrame) cancelAnimationFrame(sliderFrame);
      
      // 渲染任务 推迟到当前帧的末尾; 滑块拖动 即 触发新的 cancel 和 request
      sliderFrame = requestAnimationFrame(() => {
        sliderFrame = 0;
        if (getCurrentMode() !== 'C') return;
        
        // 此时获取的是滑块最终停留的值, 避免了中间过程的无效渲染
        const finalCount = parseInt(rangeC.value, 10);
        renderCIncremental(finalCount, target);
      });
    };

    rangeC.addEventListener('input', handleSliderChange);
    rangeC.addEventListener('change', handleSliderChange);

    document.getElementById('btn-c-dec').addEventListener('click', () => {
      const val = Math.max(0, parseInt(rangeC.value, 10) - 1);
      rangeC.value = String(val);
      handleSliderChange();
    });

    document.getElementById('btn-c-inc').addEventListener('click', () => {
      const val = Math.min(45, parseInt(rangeC.value, 10) + 1);
      rangeC.value = String(val);
      handleSliderChange();
    });
  }
  else if (mode === 'F') {
    // ==========================================
    // F 模式：只绑定切换按钮
    // ==========================================
    const btnModeF = document.getElementById('btn-mode-f');
    btnModeF.addEventListener('click', () => {
      if (getCurrentMode() === 'F') return;
      setMode('F');
    });
  }
  else if (mode === 'V') {
    const btnModeV = document.getElementById('btn-mode-v');
    btnModeV.addEventListener('click', () => {
      if (getCurrentMode() === 'V') return;
      setMode('V');
    });
  }

  // 返回同步函数
  return syncModeButtons;
}