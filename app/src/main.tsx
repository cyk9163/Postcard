import React from 'react';
import {createRoot} from 'react-dom/client';
import Entry from './Entry';
import {GameInstall} from './GameInstall';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><GameInstall><Entry/></GameInstall></React.StrictMode>);

import './companions.css';

import './expansion.css';
import './travel-ui.css';

import './cottage.css';

import './readability.css';
