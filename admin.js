import { db } from './firebase-config.js';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    loadAdminPhotos();
    loadAdminVlogs();
    loadAdminMessages();
    loadAdminTasks();

    document.getElementById('add-photo-form').addEventListener('submit', addPhoto);
    document.getElementById('publish-vlog-form').addEventListener('submit', addVlog);
    document.getElementById('add-task-btn').addEventListener('click', addTask);
});

function loadAdminPhotos() {
    const list = document.getElementById('admin-photos-list');
    const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        list.innerHTML = snapshot.docs.map(docSnapshot => {
            const p = docSnapshot.data();
            return `
                <div class="mini-card">
                    <img src="${p.imageUrl}" alt="${p.title}">
                    <h5 style="margin-top:5px;">${p.title}</h5>
                    <button onclick="deleteDocument('photos', '${docSnapshot.id}')" class="btn-delete">Delete</button>
                </div>
            `;
        }).join('') || '<p style="color:#94a3b8;">No photos added yet.</p>';
    });
}

function loadAdminVlogs() {
    const list = document.getElementById('admin-vlogs-list');
    const q = query(collection(db, "vlogs"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        list.innerHTML = snapshot.docs.map(docSnapshot => {
            const v = docSnapshot.data();
            return `
                <div class="mini-card">
                    <iframe src="${v.videoUrl}"></iframe>
                    <h5 style="margin-top:5px;">${v.title}</h5>
                    <button onclick="deleteDocument('vlogs', '${docSnapshot.id}')" class="btn-delete">Delete</button>
                </div>
            `;
        }).join('') || '<p style="color:#94a3b8;">No vlogs posted yet.</p>';
    });
}

function loadAdminMessages() {
    const list = document.getElementById('admin-messages-list');
    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        list.innerHTML = snapshot.docs.map(docSnapshot => {
            const m = docSnapshot.data();
            return `
                <div style="border:1px solid rgba(255,255,255,0.08); padding:10px; border-radius:8px; margin-bottom:10px;">
                    <strong>${m.name}</strong> (${m.email})
                    <p style="margin:5px 0; color:#cbd5e1;">${m.message}</p>
                    <button onclick="deleteDocument('messages', '${docSnapshot.id}')" class="btn-delete">Delete</button>
                </div>
            `;
        }).join('') || '<p style="color:#94a3b8;">No messages received.</p>';
    });
}

function loadAdminTasks() {
    const list = document.getElementById('admin-tasks-list');
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        list.innerHTML = snapshot.docs.map(docSnapshot => {
            const t = docSnapshot.data();
            return `
                <li class="task-item">
                    <span>${t.text}</span>
                    <button onclick="deleteDocument('tasks', '${docSnapshot.id}')" class="btn-delete" style="width:auto;">Remove</button>
                </li>
            `;
        }).join('') || '<p style="color:#94a3b8;">No active tasks.</p>';
    });
}

async function addPhoto(e) {
    e.preventDefault();
    const title = document.getElementById('photo-title').value;
    const imageUrl = document.getElementById('photo-url').value;

    await addDoc(collection(db, "photos"), {
        title, imageUrl,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now()
    });

    document.getElementById('add-photo-form').reset();
}

async function addVlog(e) {
    e.preventDefault();
    const title = document.getElementById('vlog-title').value;
    let videoUrl = document.getElementById('vlog-url').value;
    const description = document.getElementById('vlog-desc').value;

    if (videoUrl.includes('watch?v=')) videoUrl = videoUrl.replace('watch?v=', 'embed/');
    else if (videoUrl.includes('youtu.be/')) videoUrl = videoUrl.replace('youtu.be/', 'www.youtube.com/embed/');

    await addDoc(collection(db, "vlogs"), {
        title, videoUrl, description,
        date: new Date().toISOString().split('T')[0],
        createdAt: Date.now()
    });

    document.getElementById('publish-vlog-form').reset();
}

async function addTask() {
    const input = document.getElementById('new-task-text');
    const text = input.value.trim();
    if (!text) return;

    await addDoc(collection(db, "tasks"), { text, createdAt: Date.now() });
    input.value = '';
}

window.deleteDocument = async function(colName, id) {
    if (confirm("Delete item?")) {
        await deleteDoc(doc(db, colName, id));
    }
};