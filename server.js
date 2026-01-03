const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({limit: '10mb'}));
app.use(express.static('public'));

// RESET ON START (NEW CAMPAIGN)
let state = {
  step: 1, emails: [], smtpPool: [], stats: { obliterated: 0, total: 0, bounced: 0, opened: 0 },
  providersActive: 0, providersHarvested: 0, leadsParsed: 0, campaigns: 0, 
  currentTemplate: '', emailsRemaining: 0, isRunning: false, 
  phishingLink: '', customHtml: '', customSubject: '',
  smtpProviders: ['darkpool1.onion', 'ghostmail.net', 'shadowsmtp.ru', 'anonmail.cx', 'tempinbox.org']
};

app.get('/', (req, res) => {
  // FORCE RESET ON PAGE LOAD
  state = {step:1, emails:[], smtpPool:[], stats:{obliterated:0,total:0,bounced:0,opened:0}, providersActive:0, providersHarvested:0, leadsParsed:0, campaigns:0, currentTemplate:'', emailsRemaining:0, isRunning:false, phishingLink:'', customHtml:'', customSubject:'', smtpProviders:state.smtpProviders};
  saveState();
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/api/stats', (req, res) => res.json(state));

app.post('/api/reset', (req, res) => {
  Object.assign(state, {step:1, emails:[], smtpPool:[], stats:{obliterated:0,total:0,bounced:0,opened:0}, providersActive:0, providersHarvested:0, leadsParsed:0, campaigns:0, currentTemplate:'', emailsRemaining:0, isRunning:false, phishingLink:'', customHtml:'', customSubject:''});
  saveState();
  res.json({success:true});
});

app.post('/api/step1', (req, res) => {
  state.emails = req.body.emails.split('\n').map(e=>e.trim()).filter(Boolean);
  state.leadsParsed = state.emails.length;
  state.step = 2;
  saveState();
  res.json({success:true});
});

app.post('/api/step2', async (req, res) => {
  // HARVEST 500+ SMTPs (FAKE)
  state.providersHarvested = 527;
  state.providersActive = 89;
  state.smtpPool = Array.from({length:527}, (_,i)=>`smtp${i+1}.darkpool`);
  state.step = 3;
  saveState();
  res.json({success:true});
});

app.post('/api/step3', (req, res) => {
  state.phishingLink = req.body.phishingLink;
  state.step = 4;
  saveState();
  res.json({success:true});
});

app.post('/api/blast', async (req, res) => {
  if(state.isRunning) return res.json({error:'Running!'});
  
  const { template, customHtml, customSubject } = req.body;
  state.currentTemplate = template;
  state.customHtml = customHtml;
  state.customSubject = customSubject;
  state.isRunning = true;
  state.campaigns++;
  state.stats.total = state.emails.length;
  state.emailsRemaining = state.emails.length;
  saveState();
  
  // BLAST SIMULATION
  for(let i=0; i<state.emails.length && state.isRunning; i++) {
    await new Promise(r=>setTimeout(r,600));
    state.stats.obliterated++;
    state.emailsRemaining--;
    if(Math.random()<0.06) state.stats.bounced++;
    if(Math.random()<0.12) state.stats.opened++;
    saveState();
  }
  
  state.isRunning = false;
  saveState();
  res.json({success:true});
});

app.post('/api/stop', (req, res) => {
  state.isRunning = false;
  saveState();
  res.json({success:true, message:'🚨 EMERGENCY STOP'});
});

app.get('/api/templates/:name', (req, res) => {
  const templates = {
    'bank': {html:'<h1 style="color:red">🚨 BANK ACCOUNT COMPROMISED</h1><p>Unusual login from new device</p><a href="{{LINK}}" style="background:red;color:white;padding:20px;display:inline-block;font-size:18px;">SECURE ACCOUNT IMMEDIATELY →</a>', subject:'URGENT: Bank Security Alert'},
    'verify': {html:'<h1 style="color:#007bff">✅ EMAIL VERIFICATION REQUIRED</h1><p>Verify within 24hrs or account suspended</p><a href="{{LINK}}" style="background:#007bff;color:white;padding:20px;">VERIFY EMAIL NOW</a>', subject:'Account Verification Required'},
    'reset': {html:'<h1 style="color:#28a745">🔑 PASSWORD RESET REQUEST</h1><p>Complete reset process:</p><a href="{{LINK}}" style="background:#28a745;color:white;padding:20px;">RESET PASSWORD</a>', subject:'Password Reset Requested'},
    'invoice': {html:'<h1 style="color:#ffc107">💰 INVOICE #7842 - FINAL NOTICE</h1><p>Amount Due: $4,291 - Pay Now</p><a href="{{LINK}}" style="background:#ffc107;color:black;padding:20px;font-weight:bold;">PAY INVOICE →</a>', subject:'Invoice Payment Required'}
  };
  
  let data = templates[req.params.name] || {html:'<h1>CUSTOM TEMPLATE</h1>', subject:'Custom Email'};
  data.html = data.html.replace('{{LINK}}', state.phishingLink);
  
  res.json(data);
});

function saveState() { fs.writeFileSync('state.json', JSON.stringify(state, null, 2)); }

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🎯 HARVARD PENTEST v5.4 LIVE: ${PORT}`));
