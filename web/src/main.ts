import './styles.css';
import './app.css';
import './game/boot';
import { initAccount } from './net/account';
import { registerSW } from './net/push';
import { initNet } from './net/sync';

initAccount();
initNet();
registerSW();
