import './styles/fonts.css';
import './styles/app.css';
import { startApp } from './ui/app';

const root = document.getElementById('app');
if (root) startApp(root);
