import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8Qc9fB-D8nNxaLlwlshoJrzxRwtDpVI0",
    authDomain: "family-71e48.firebaseapp.com",
    databaseURL: "https://family-71e48-default-rtdb.firebaseio.com",
    projectId: "family-71e48",
    storageBucket: "family-71e48.firebasestorage.app",
    messagingSenderId: "883664987433",
    appId: "1:883664987433:web:cf2809efa81dcf9c218338",
    measurementId: "G-EZQ2WJHDKD"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function addItem() {
    let name = document.getElementById("itemName").value;
    let quantity = document.getElementById("quantity").value;
    let weight = document.getElementById("weight").value || "N/A";

    if (name.trim() === "" || quantity.trim() === "") {
        alert("Please enter item name and quantity");
        return;
    }

    let newItemRef = push(ref(db, "items/"));
    set(newItemRef, {
        name: name,
        quantity: quantity,
        weight: weight,
        status: "pending"
    });

    document.getElementById("itemName").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("weight").value = "";
}

function loadItems() {
    let itemList = document.getElementById("itemList");
    itemList.innerHTML = "";

    onValue(ref(db, "items/"), (snapshot) => {
        itemList.innerHTML = "";
        snapshot.forEach((childSnapshot) => {
            let data = childSnapshot.val();
            let li = document.createElement("li");

            if (data.status === "done") {
                li.classList.add("completed");
            } else if (data.status === "crossed") {
                li.classList.add("crossed");
            }

            li.innerHTML = `
                <span class="item-text">${data.name} - ${data.quantity} (${data.weight})</span>
                <button class="check-btn" onclick="markDone('${childSnapshot.key}')">✔️</button>
                <button class="cross-btn" onclick="markCross('${childSnapshot.key}')">❌</button>
                <button class="delete-btn" onclick="deleteItem('${childSnapshot.key}')">🗑</button>
            `;
            itemList.appendChild(li);
        });
    });
}

function markDone(itemId) {
    update(ref(db, "items/" + itemId), { status: "done" });
}

function markCross(itemId) {
    update(ref(db, "items/" + itemId), { status: "crossed" });
}

function deleteItem(itemId) {
    remove(ref(db, "items/" + itemId));
}

window.addItem = addItem;
window.loadItems = loadItems;
window.markDone = markDone;
window.markCross = markCross;
window.deleteItem = deleteItem;

loadItems();
