// Zombie Apocalypse - Blood Particle System

class ParticleSystem {
  constructor(container) {
    this.container = container;
    this.particles = [];
    this.isRunning = false;
    this.animationId = null;
    this.config = {
      count: 30,
      minSize: 2,
      maxSize: 6,
      minSpeed: 5,
      maxSpeed: 15,
      minDelay: 0,
      maxDelay: 5,
      color: 'rgba(193, 18, 31, 0.6)',
    };
  }

  /**
   * Start the particle system.
   */
  start(config = {}) {
    if (this.isRunning) return;
    Object.assign(this.config, config);
    this.isRunning = true;

    // Create initial particles
    for (let i = 0; i < this.config.count; i++) {
      this.createParticle(i * (this.config.maxDelay / this.config.count));
    }
  }

  /**
   * Create a single blood particle element.
   */
  createParticle(delay = 0) {
    const el = document.createElement('div');
    el.className = 'blood-particle';

    const size = this.config.minSize + Math.random() * (this.config.maxSize - this.config.minSize);
    const speed = this.config.minSpeed + Math.random() * (this.config.maxSpeed - this.config.minSpeed);
    const x = Math.random() * 100;
    const duration = (100 / speed) * 2; // time to fall
    const startDelay = delay + Math.random() * 2;

    el.style.cssText = `
      left: ${x}%;
      width: ${size}px;
      height: ${size}px;
      animation-delay: ${startDelay}s;
      animation-duration: ${duration}s;
      opacity: 0.3 + ${Math.random() * 0.4};
    `;

    this.container.appendChild(el);
    this.particles.push({ el, duration, startDelay });
  }

  /**
   * Stop the particle system.
   */
  stop() {
    this.isRunning = false;
    this.particles.forEach(p => {
      if (p.el.parentNode) {
        p.el.parentNode.removeChild(p.el);
      }
    });
    this.particles = [];
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Clean up.
   */
  destroy() {
    this.stop();
  }
}

window.ParticleSystem = ParticleSystem;
