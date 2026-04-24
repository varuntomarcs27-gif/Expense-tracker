import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp,
    deleteDoc,
    doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// DOM Elements
const transactionForm = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeSelect = document.getElementById('type');
const transactionList = document.getElementById('transaction-list');
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const itemCountEl = document.getElementById('item-count');

// State
let transactions = [];

// Initialize & Listen
function init() {
    const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderTransactions();
        updateSummary();
    }, (error) => {
        console.error("Firestore Listen Error:", error);
        transactionList.innerHTML = '<div class="empty-msg">Error loading data. Check console.</div>';
    });
}

// Render List
function renderTransactions() {
    transactionList.innerHTML = '';
    
    if (transactions.length === 0) {
        transactionList.innerHTML = '<div class="empty-msg">No transactions yet. Add one above!</div>';
        itemCountEl.textContent = '0 items';
        return;
    }

    itemCountEl.textContent = `${transactions.length} items`;

    transactions.forEach(t => {
        const item = document.createElement('div');
        item.className = `transaction-item ${t.type}`;
        
        const amountFormatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(t.amount);

        const date = t.timestamp ? new Date(t.timestamp.toDate()).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) : 'Pending...';

        item.innerHTML = `
            <div class="item-info">
                <span class="title">${t.description}</span>
                <span class="date">${date}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="item-amount">${t.type === 'expense' ? '-' : '+'}${amountFormatted}</span>
                <button class="delete-btn" data-id="${t.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        transactionList.appendChild(item);
    });

    // Add delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = (e) => deleteTransaction(e.currentTarget.dataset.id);
    });
}

// Update Totals
function updateSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;

    const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

    totalBalanceEl.textContent = formatter.format(balance);
    totalIncomeEl.textContent = `+${formatter.format(income)}`;
    totalExpenseEl.textContent = `-${formatter.format(expense)}`;
}

// Add Transaction
transactionForm.onsubmit = async (e) => {
    e.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = typeSelect.value;

    if (!description || isNaN(amount) || amount <= 0) return;

    const btn = transactionForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = "Adding...";

    try {
        await addDoc(collection(db, "transactions"), {
            description,
            amount,
            type,
            timestamp: serverTimestamp()
        });

        // Reset form
        descriptionInput.value = '';
        amountInput.value = '';
        descriptionInput.focus();
    } catch (error) {
        console.error("Error adding transaction:", error);
        alert("Failed to add transaction. Check console for details.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Add Transaction";
    }
};

// Delete Transaction
async function deleteTransaction(id) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    
    try {
        await deleteDoc(doc(db, "transactions", id));
    } catch (error) {
        console.error("Error deleting document:", error);
    }
}

// Start
init();
