import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// --- DATA ---
let rooms = [
    { id: 101, type: 'Single', price: 6000, status: 'Available', tenant: null },
    { id: 102, type: 'Double', price: 4000, status: 'Occupied', tenant: 'john' }
];

let users = [
    { name: 'Manager', username: 'admin', password: '123', role: 'admin' },
    { 
        name: 'John Doe', 
        username: 'john', 
        password: '123', 
        role: 'tenant', 
        rentStatus: 'Due', 
        food: 'Veg',
        age: 25,
        address: '123 Main St, Chennai'
    }
];

let complaints = [];

// --- ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.json({ success: true, role: user.role, username: user.username, name: user.name });
    else res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.get('/api/users', (req, res) => {
    const tenants = users.filter(u => u.role === 'tenant');
    res.json(tenants);
});

app.get('/api/user/:username', (req, res) => {
    const user = users.find(u => u.username === req.params.username);
    if (user) res.json(user);
    else res.status(404).json({ message: "User not found" });
});

// CREATE TENANT (Updated with Age & Address)
app.post('/api/users', (req, res) => {
    const { name, username, password, age, address } = req.body;
    
    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: 'Username taken' });
    }

    users.push({ 
        name, username, password, 
        age, address,
        role: 'tenant', 
        rentStatus: 'Due', 
        food: 'None' 
    });
    
    res.json({ success: true, message: 'Tenant Created' });
});

app.post('/api/users/rent', (req, res) => {
    const { username, status } = req.body;
    const user = users.find(u => u.username === username);
    if (user) { user.rentStatus = status; res.json({ success: true }); }
    else res.status(404).json({ success: false });
});

app.post('/api/users/food', (req, res) => {
    const { username, food } = req.body;
    const user = users.find(u => u.username === username);
    if (user) { user.food = food; res.json({ success: true }); } 
    else res.status(404).json({ success: false });
});

app.get('/api/rooms', (req, res) => res.json(rooms));
app.post('/api/rooms', (req, res) => {
    rooms.push({ ...req.body, status: 'Available', tenant: null });
    res.json({ success: true });
});

app.post('/api/book', (req, res) => {
    const { roomId, username } = req.body;
    const idx = rooms.findIndex(r => r.id == roomId);
    if (idx !== -1 && rooms[idx].status === 'Available') {
        rooms[idx].status = 'Occupied';
        rooms[idx].tenant = username;
        res.json({ success: true, message: 'Booked!' });
    } else {
        res.status(400).json({ success: false });
    }
});

app.post('/api/vacate', (req, res) => {
    const { roomId } = req.body;
    const idx = rooms.findIndex(r => r.id == roomId);
    if (idx !== -1) {
        rooms[idx].status = 'Available';
        rooms[idx].tenant = null;
        res.json({ success: true, message: 'Vacated' });
    } else {
        res.status(400).json({ success: false });
    }
});

app.get('/api/complaints', (req, res) => res.json(complaints));
app.post('/api/complaints', (req, res) => {
    const { type, desc, raisedBy } = req.body;
    complaints.push({ id: Date.now(), type, desc, status: 'Open', raisedBy, date: new Date().toLocaleDateString() });
    res.json({ success: true });
});
app.post('/api/complaints/resolve', (req, res) => {
    const { id } = req.body;
    const ticket = complaints.find(c => c.id == id);
    if (ticket) { ticket.status = 'Resolved'; res.json({ success: true }); }
    else res.status(404).json({ success: false });
});

app.get('/api/stats', (req, res) => {
    res.json({ 
        totalRooms: rooms.length, 
        occupied: rooms.filter(r => r.status === 'Occupied').length,
        pendingRent: users.filter(u => u.role === 'tenant' && u.rentStatus === 'Due').length,
        openComplaints: complaints.filter(c => c.status === 'Open').length
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));