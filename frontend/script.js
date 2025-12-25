// --- AUTH & NAV ---
async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('pg_user', JSON.stringify(data));
            if(data.role === 'admin') window.location.href = 'admin.html';
            else window.location.href = 'tenant.html';
        } else {
            document.getElementById('error-msg').innerText = data.message;
        }
    } catch (e) { alert("Server error"); }
}

function checkAuth(requiredRole) {
    const userStr = localStorage.getItem('pg_user');
    if (!userStr) { window.location.href = 'index.html'; return; }
    const user = JSON.parse(userStr);
    if (user.role !== requiredRole) window.location.href = 'index.html';
    const welcome = document.getElementById('welcome-msg');
    if(welcome) welcome.innerText = `Welcome, ${user.name}`;
}

function logout() { localStorage.removeItem('pg_user'); window.location.href = 'index.html'; }

function toggleForm(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
}

// --- SHARED VACATE ---
async function vacateRoom(roomId) {
    if(!confirm("Vacate this room?")) return;
    await fetch('/api/vacate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ roomId })
    });
    const user = JSON.parse(localStorage.getItem('pg_user'));
    user.role === 'admin' ? loadAdminData() : loadTenantData();
}

// --- ADMIN LOGIC ---
async function loadAdminData() {
    // 1. Stats
    const stats = await (await fetch('/api/stats')).json();
    document.getElementById('adm-occ').innerText = stats.occupied;
    document.getElementById('adm-due').innerText = stats.pendingRent;
    document.getElementById('adm-issues').innerText = stats.openComplaints;

    // 2. Complaints
    const tickets = await (await fetch('/api/complaints')).json();
    const tickList = document.getElementById('complaint-list');
    if(tickets.length === 0) tickList.innerHTML = '<div style="padding:15px">No complaints found.</div>';
    else {
        tickList.innerHTML = tickets.map(t => `
            <div class="list-item">
                <div>
                    <span class="tag ${t.status === 'Open' ? 'due' : 'paid'}">${t.status}</span>
                    <strong>${t.type}:</strong> ${t.desc} <br>
                    <small>By: ${t.raisedBy} | Date: ${t.date}</small>
                </div>
                ${t.status === 'Open' ? `<button class="action-btn" style="padding:5px 10px; font-size:12px;" onclick="resolveTicket(${t.id})">Mark Resolved</button>` : ''}
            </div>
        `).join('');
    }

    // 3. Rooms
    const rooms = await (await fetch('/api/rooms')).json();
    document.getElementById('admin-list').innerHTML = rooms.map(r => `
        <div class="list-item">
            <div>
                <strong>Room ${r.id}</strong> 
                ${r.status === 'Occupied' ? `<span style="color:#e74c3c">(${r.tenant})</span>` : '<span style="color:green">(Empty)</span>'}
            </div>
            <div>
                ${r.status === 'Occupied' ? `<button class="vacate-btn" onclick="vacateRoom(${r.id})">Vacate</button>` : ''}
            </div>
        </div>
    `).join('');

    // 4. Tenant Details (UPDATED VIEW)
    const tenants = await (await fetch('/api/users')).json();
    document.getElementById('tenant-directory').innerHTML = tenants.map(t => `
        <div class="list-item" style="display:block;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong>${t.name}</strong> 
                <span>
                    <button style="background:#27ae60; color:white; border:none; padding:5px;" onclick="markRent('${t.username}', 'Paid')">Paid</button>
                    <button style="background:#e74c3c; color:white; border:none; padding:5px;" onclick="markRent('${t.username}', 'Due')">Due</button>
                </span>
            </div>
            <div style="font-size:0.9em; color:#555;">
                User: ${t.username} | Age: ${t.age || 'N/A'} | Rent: <b style="color:${t.rentStatus==='Due'?'red':'green'}">${t.rentStatus}</b>
                <br>
                Address: ${t.address || 'N/A'}
            </div>
        </div>
    `).join('');
}

// REGISTER TENANT (UPDATED)
async function registerTenant() {
    const name = document.getElementById('t-name').value;
    const username = document.getElementById('t-user').value;
    const password = document.getElementById('t-pass').value;
    const age = document.getElementById('t-age').value;
    const address = document.getElementById('t-addr').value;

    const res = await fetch('/api/users', { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ name, username, password, age, address }) 
    });
    const data = await res.json();
    alert(data.message);
    if(data.success) { toggleForm('tenant-form'); loadAdminData(); }
}

async function resolveTicket(id) {
    await fetch('/api/complaints/resolve', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
    loadAdminData();
}

async function markRent(username, status) {
    await fetch('/api/users/rent', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ username, status }) });
    loadAdminData();
}

async function addRoom() {
    const id = document.getElementById('r-id').value;
    const type = document.getElementById('r-type').value;
    const price = document.getElementById('r-price').value;
    const res = await fetch('/api/rooms', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, type, price }) });
    if((await res.json()).success) { toggleForm('room-form'); loadAdminData(); }
}

// --- TENANT LOGIC (Standard) ---
async function loadTenantData() {
    const user = JSON.parse(localStorage.getItem('pg_user'));
    
    // Details
    const myData = await (await fetch(`/api/user/${user.username}`)).json();
    document.getElementById('my-rent').innerText = myData.rentStatus;
    document.getElementById('my-rent').style.color = myData.rentStatus === 'Due' ? 'red' : 'green';
    document.getElementById('my-food').value = myData.food || 'None';

    // Tickets
    const allTickets = await (await fetch('/api/complaints')).json();
    const myTickets = allTickets.filter(t => t.raisedBy === user.username);
    document.getElementById('my-tickets').innerHTML = myTickets.length ? myTickets.map(t => `
        <div class="list-item">
            <span><b>${t.type}:</b> ${t.desc}</span>
            <span class="tag ${t.status==='Open'?'due':'paid'}">${t.status}</span>
        </div>
    `).join('') : '<div style="padding:15px">No tickets raised.</div>';

    // Rooms
    const rooms = await (await fetch('/api/rooms')).json();
    document.getElementById('room-list').innerHTML = rooms.map(r => {
        if(r.status === 'Occupied' && r.tenant === user.username) {
            return `<div class="list-item" style="border:1px solid green; background:#e8f5e9">
                <b>✅ Your Room: ${r.id}</b>
                <button class="vacate-btn" onclick="vacateRoom(${r.id})">Vacate</button>
            </div>`;
        } else if (r.status === 'Available') {
            return `<div class="list-item">
                Room ${r.id} (₹${r.price}) 
                <button class="action-btn" style="padding:5px 10px;" onclick="bookRoom(${r.id})">Book</button>
            </div>`;
        }
        return '';
    }).join('');
}

async function raiseComplaint() {
    const user = JSON.parse(localStorage.getItem('pg_user'));
    const type = document.getElementById('c-type').value;
    const desc = document.getElementById('c-desc').value;
    await fetch('/api/complaints', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ type, desc, raisedBy: user.username }) });
    alert('Complaint Submitted');
    toggleForm('complaint-form');
    loadTenantData();
}

async function updateFood() {
    const user = JSON.parse(localStorage.getItem('pg_user'));
    const food = document.getElementById('my-food').value;
    await fetch('/api/users/food', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ username: user.username, food }) });
    alert('Preference Saved');
}

async function bookRoom(roomId) {
    if(!confirm("Book Room?")) return;
    const user = JSON.parse(localStorage.getItem('pg_user'));
    const res = await fetch('/api/book', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ roomId, username: user.username }) });
    if((await res.json()).success) loadTenantData();
}