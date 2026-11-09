import './style.css';
import { mount } from './ui.js';
import { startDust } from './dust.js';

const app = document.getElementById('app');
const dust = document.getElementById('dust');
startDust(dust);
mount(app);
