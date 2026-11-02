/**
 * Thapar ELC Homepage - Streamlined Controller
 * Focused, uncluttered data model for the official institutional homepage.
 */

const FEATURED_PROJECTS = [
  {
    id: 'thar-ev',
    category: 'Electric Mobility',
    title: 'THAR-eV: Diesel-to-Electric Vehicle Conversion',
    tagline: 'An interdisciplinary team of 150+ undergraduate students converted an internal combustion diesel Mahindra Thar into a road-tested electric vehicle.',
    timeline: 'Nov 2018 – Mar 2023',
    cohort: '150+ Students (Mechanical, Mechatronics, Electrical, CS)',
    mentors: 'Mr. A. S. Jawanda, Dr. R. K. Duvedi, Dr. Gagandeep Kaur, Dr. Nirbhowjap Singh',
    breakthrough: 'Designed custom battery pack enclosures, high-voltage battery management systems (BMS), motor controller mounts, high-current busbars, and regenerative braking circuits.',
    tooling: 'CNC Laser cutting, hydraulic tube bending, electrical diagnostic dynamometer, high-current busbar fabrication.',
    impact: 'First fully operational version completed in March 2023. Benchmark initiative demonstrating complete automotive life cycle engineering at undergraduate level.'
  },
  {
    id: 'autonomous-vehicle',
    category: 'Robotics & Autonomy',
    title: 'Outdoor Autonomous Vehicle Test System (Drive-by-Wire)',
    tagline: 'Custom-designed outdoor autonomous mobile vehicle test platform capable of full drive-by-wire, steer-by-wire, and brake-by-wire actuation.',
    timeline: 'Jan 2019 – Present',
    cohort: 'Mechanical, ECE & CS Undergraduate Team',
    mentors: 'Dr. Hem Dutt Joshi, Dr. R. K. Duvedi, Dr. Kulbir Singh, Dr. Bikramjit Sharma',
    breakthrough: 'Integrated ROS (Robot Operating System) with multi-channel actuator telemetry, emergency cutoff fail-safes, and outdoor localization sensors.',
    tooling: 'Actuator servos, custom steering link machining, CAN bus transceivers, onboard computing.',
    impact: 'Functional prototype demonstrated live at the Military Literature Festival and Showcase Event at Khalsa College, Patiala (Jan 2023).'
  },
  {
    id: 'thaparsat',
    category: 'Satellite Systems',
    title: 'Pneumatic Calibration Chamber for ThaparSat Satellite',
    tagline: 'Optical gas simulator chamber designed for laboratory ground calibration of the spectral camera onboard the ThaparSat satellite payload.',
    timeline: 'Jan 2022 – Mar 2025',
    cohort: 'ELC Space Instrumentation Group',
    mentors: 'Dr. R. K. Duvedi, Ms. Twinkle Sharma, Dr. Vineet Srivastava, Dr. Mamta Gulati',
    breakthrough: 'Engineered high-purity pneumatic delivery for conditioned air, CO2, and CH4 gases with integrated optical isolation and automated safety purge routines.',
    tooling: 'Hermetic pressure vessel, mass flow controllers, IR gas detectors, optical calibration targets.',
    impact: 'System built, calibrated, and deployed in the Thapar Satellite Project laboratory in March 2025.'
  }
];

function openProjectModal(id) {
  const project = FEATURED_PROJECTS.find(p => p.id === id);
  if (!project) return;

  const modal = document.getElementById('project-modal');
  const container = document.getElementById('project-modal-body');
  if (!modal || !container) return;

  container.innerHTML = `
    <div class="flex items-start justify-between border-b border-slate-200 pb-4 mb-6">
      <div>
        <span class="text-xs font-mono-tech uppercase text-[#0f2756] font-bold tracking-wider mb-1 block">
          ${project.category} • Verified Technical Dossier
        </span>
        <h2 class="text-2xl sm:text-3xl font-bold font-syne text-slate-900 leading-snug">${project.title}</h2>
        <div class="text-xs text-slate-500 font-mono-tech mt-1">Timeline: ${project.timeline}</div>
      </div>
      <button onclick="closeProjectModal()" class="text-slate-400 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <i data-lucide="x" class="w-6 h-6"></i>
      </button>
    </div>

    <div class="space-y-6 text-sm text-slate-700">
      <div>
        <h5 class="text-xs font-mono-tech uppercase text-slate-400 font-bold mb-1">Project Summary</h5>
        <p class="leading-relaxed text-slate-800 text-base">${project.tagline}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono-tech">
        <div class="p-4 bg-slate-50 rounded-lg">
          <span class="text-slate-400 block mb-0.5 uppercase font-bold">Faculty Mentorship</span>
          <span class="font-bold text-slate-900">${project.mentors}</span>
        </div>
        <div class="p-4 bg-slate-50 rounded-lg">
          <span class="text-slate-400 block mb-0.5 uppercase font-bold">Student Cohort</span>
          <span class="font-bold text-slate-900">${project.cohort}</span>
        </div>
      </div>

      <div class="border-t border-slate-100 pt-4">
        <h5 class="text-xs font-mono-tech uppercase text-slate-400 font-bold mb-1">Technical Architecture</h5>
        <p class="text-slate-800 leading-relaxed">${project.breakthrough}</p>
      </div>

      <div class="border-t border-slate-100 pt-4">
        <h5 class="text-xs font-mono-tech uppercase text-slate-400 font-bold mb-1">Equipment &amp; Facilities Utilized</h5>
        <p class="text-slate-800">${project.tooling}</p>
      </div>

      <div class="p-4 bg-red-50 text-red-950 rounded-lg text-xs">
        <h5 class="font-mono-tech uppercase text-[#be1e2d] font-bold mb-1">Institutional Impact &amp; Deployment</h5>
        <p class="font-medium">${project.impact}</p>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

function openActionModal(type) {
  const modal = document.getElementById('action-dialog-modal');
  const title = document.getElementById('action-dialog-title');
  if (modal && title) {
    title.innerText = type === 'safety' ? 'Download ELC Safety Protocol (PDF)' : 'Student Workbench & Project Proposal';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeActionModal() {
  const modal = document.getElementById('action-dialog-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Mobile navigation drawer toggle
  const mobileBtn = document.getElementById('mobile-toggle-btn');
  const mobileMenu = document.getElementById('mobile-nav-dropdown');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
