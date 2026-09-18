import { db } from './firebase-config.js';
import { collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    loadVlogs();

    const contactForm = document.getElementById('public-contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
});

function loadPhotos() {
    const grid = document.getElementById('public-photos-grid');
    const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            grid.innerHTML = '<p>No photos uploaded yet.</p>';
            return;
        }

        grid.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="glass-card">
                    <img src="${data.imageUrl}" alt="${data.title}" style="width:100%; height:180px; object-fit:cover; border-radius:8px;">
                    <div style="padding-top:10px;">
                        <h3>${data.title}</h3>
                        <small style="color:#94a3b8;">${data.date}</small>
                    </div>
                </div>
            `;
        }).join('');
    });
}

function loadVlogs() {
    const grid = document.getElementById('public-vlogs-grid');
    const q = query(collection(db, "vlogs"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            grid.innerHTML = '<p>No vlogs posted yet.</p>';
            return;
        }

        grid.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="glass-card">
                    <iframe src="${data.videoUrl}" style="width:100%; height:180px; border:none; border-radius:8px;" allowfullscreen></iframe>
                    <div style="padding-top:10px;">
                        <h3>${data.title}</h3>
                        <p style="color:#94a3b8; font-size:0.9rem;">${data.description || ''}</p>
                    </div>
                </div>
            `;
        }).join('');
    });
}

async function handleContactSubmit(e) {
    e.preventDefault();
    const statusMsg = document.getElementById('form-status');
    const sendBtn = document.getElementById('send-btn');

    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;

    statusMsg.innerText = "Sending message...";
    sendBtn.disabled = true;

    try {
        await addDoc(collection(db, "messages"), {
            name, email, message,
            date: new Date().toLocaleString(),
            createdAt: Date.now()
        });

        statusMsg.innerText = "Message sent successfully!";
        statusMsg.style.color = "#4ade80";
        document.getElementById('public-contact-form').reset();
    } catch (err) {
        statusMsg.innerText = "Error sending message. Try again.";
        statusMsg.style.color = "#f87171";
    } finally {
        sendBtn.disabled = false;
    }
}