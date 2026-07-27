// Zombie Apocalypse - Main Menu

class MainMenu {
  constructor() {
    this.screen = document.getElementById('menu-screen');
    this.nameInput = document.getElementById('player-name-input');
    this.teamOptions = document.querySelectorAll('.team-option');
    this.enterBtn = document.getElementById('enter-btn');
    this.selectedTeam = 'survivor';
    this.particleSystem = null;
    this.isVisible = true;
  }

  /**
   * Initialize the menu.
   */
  init() {
    this.setupTeamSelection();
    this.setupEnterButton();
    this.setupNameInput();
    this.setupAudioContext();
    this.startParticles();
  }

  /**
   * Setup team selection toggle.
   */
  setupTeamSelection() {
    this.teamOptions.forEach(option => {
      option.addEventListener('click', () => {
        const team = option.dataset.team;
        this.selectedTeam = team;
        this.teamOptions.forEach(opt => {
          opt.className = 'team-option';
          if (opt.dataset.team === team) {
            opt.classList.add(`selected-${team}`);
          }
        });
      });

      // Hover sounds
      option.addEventListener('mouseenter', () => {
        if (window.audio && window.audio.initialized) {
          window.audio.playHover();
        }
      });
    });
  }

  /**
   * Setup the enter button.
   */
  setupEnterButton() {
    this.enterBtn.addEventListener('click', () => {
      if (this.enterBtn.disabled) return;

      const name = this.nameInput.value.trim();
      if (!this.validateName(name)) return;

      if (window.audio) {
        window.audio.playClick();
      }

      this.enterBtn.disabled = true;
      this.enterBtn.textContent = 'INITIALIZING...';

      // Emit event to start loading
      const event = new CustomEvent('menu-start', {
        detail: { name, team: this.selectedTeam },
      });
      document.dispatchEvent(event);
    });
  }

  /**
   * Setup name input validation.
   */
  setupNameInput() {
    this.nameInput.addEventListener('input', () => {
      const name = this.nameInput.value.trim();
      this.enterBtn.disabled = !this.validateName(name);
    });

    // Allow enter key to submit
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.enterBtn.disabled) {
        this.enterBtn.click();
      }
    });
  }

  /**
   * Setup audio context on first interaction.
   */
  setupAudioContext() {
    const initAudio = () => {
      if (window.audio) {
        window.audio.init();
        window.audio.resume();
      }
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
  }

  /**
   * Validate player name.
   */
  validateName(name) {
    return name && name.length >= 3 && name.length <= 16;
  }

  /**
   * Start blood particle animation.
   */
  startParticles() {
    const container = document.getElementById('blood-particles');
    if (!container) return;

    this.particleSystem = new (window.ParticleSystem || class {})();
    // Using the inline particle system
    this.startSimpleParticles(container);
  }

  /**
   * Simple CSS-based particle generation.
   */
  startSimpleParticles(container) {
    for (let i = 0; i < 25; i++) {
      const particle = document.createElement('div');
      particle.className = 'blood-particle';
      const size = 2 + Math.random() * 4;
      const delay = Math.random() * 8;
      const duration = 8 + Math.random() * 12;
      const x = Math.random() * 100;
      const opacity = 0.2 + Math.random() * 0.4;

      particle.style.cssText = `
        left: ${x}%;
        width: ${size}px;
        height: ${size}px;
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        opacity: ${opacity};
      `;
      container.appendChild(particle);
    }
  }

  /**
   * Get player data from form.
   */
  getPlayerData() {
    return {
      name: this.nameInput.value.trim(),
      team: this.selectedTeam,
    };
  }

  /**
   * Hide the menu.
   */
  hide() {
    this.screen.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    this.screen.style.opacity = '0';
    this.screen.style.transform = 'scale(1.05)';
    this.isVisible = false;

    setTimeout(() => {
      this.screen.style.display = 'none';
    }, 500);
  }

  /**
   * Show the menu (if needed after loading).
   */
  show() {
    this.screen.style.display = 'flex';
    this.screen.style.opacity = '1';
    this.screen.style.transform = 'scale(1)';
    this.isVisible = true;
  }
}

// Singleton
const mainMenu = new MainMenu();
window.mainMenu = mainMenu;
