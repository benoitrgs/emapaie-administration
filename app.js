// ============================================================================
// EMAPAIE - Application principale
// ============================================================================

let currentUser = null;
let currentPage = 'dashboard';

// ============================================================================
// Initialisation
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser Supabase
    if (!initSupabase()) {
        alert('Erreur: Impossible d\'initialiser la connexion à la base de données');
        return;
    }
    
    // Vérifier si l'utilisateur est déjà connecté
    currentUser = await Auth.getCurrentUser();
    
    if (currentUser) {
        showApp();
    } else {
        showLogin();
    }
    
    // Écouter les changements d'authentification
    Auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            showApp();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showLogin();
        }
    });
    
    // Gérer la soumission du formulaire de connexion
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Gérer la navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
});

// ============================================================================
// Authentification
// ============================================================================

function showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function showApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    
    // Mettre à jour les infos utilisateur
    if (currentUser) {
        const userName = currentUser.email.split('@')[0];
        document.getElementById('userName').textContent = userName;
        document.getElementById('userAvatar').textContent = userName.charAt(0).toUpperCase();
    }
    
    // Charger la page par défaut
    navigateTo('dashboard');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const result = await Auth.signIn(email, password);
    
    if (result.success) {
        currentUser = result.user;
        showApp();
    } else {
        alert('Erreur de connexion: ' + result.error);
    }
}

async function handleLogout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        await Auth.signOut();
    }
}

// ============================================================================
// Navigation
// ============================================================================

function navigateTo(page) {
    currentPage = page;
    
    // Mettre à jour la navigation active
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // Mettre à jour le titre
    const titles = {
        'dashboard': 'Tableau de bord',
        'clients': 'Clients',
        'prestations': 'Prestations',
        'devis': 'Devis',
        'factures': 'Factures',
        'documents': 'Gestion des fichiers',
        'parametres': 'Paramètres'
    };
    document.getElementById('pageTitle').textContent = titles[page];
    
    // Charger le contenu de la page
    loadPageContent(page);
}

async function loadPageContent(page) {
    const contentArea = document.getElementById('contentArea');
    
    try {
        switch (page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'clients':
                await loadClients();
                break;
            case 'prestations':
                await loadPrestations();
                break;
            case 'devis':
                await loadDevis();
                break;
            case 'factures':
                await loadFactures();
                break;
            case 'documents':
                await loadDocuments();
                break;
            case 'parametres':
                await loadParametres();
                break;
            default:
                contentArea.innerHTML = '<div class="card"><p>Page non trouvée</p></div>';
        }
    } catch (error) {
        console.error('Erreur chargement page:', error);
        contentArea.innerHTML = `
            <div class="card">
                <p style="color: var(--danger);">
                    Erreur lors du chargement de la page: ${error.message}
                </p>
            </div>
        `;
    }
}

// ============================================================================
// Page: Dashboard
// ============================================================================

async function loadDashboard() {
    const contentArea = document.getElementById('contentArea');
    
    // Récupérer les données
    const [devis, factures, clients] = await Promise.all([
        DevisAPI.getAll(),
        FacturesAPI.getAll(),
        ClientsAPI.getAll()
    ]);
    
    // Calculer les statistiques
    const stats = {
        totalClients: clients.length,
        devisEnCours: devis.filter(d => d.statut === 'envoye').length,
        facturesImpayees: factures.filter(f => f.statut === 'envoyee' || f.statut === 'retard').length,
        caMensuel: factures
            .filter(f => {
                const date = new Date(f.date_emission);
                const now = new Date();
                return date.getMonth() === now.getMonth() && 
                       date.getFullYear() === now.getFullYear() &&
                       f.statut === 'payee';
            })
            .reduce((sum, f) => sum + parseFloat(f.montant_ttc), 0)
    };
    
    contentArea.innerHTML = `
        <div class="page-header">
            <h2>Tableau de bord</h2>
            <p>Vue d'ensemble de votre activité</p>
        </div>
        
        <div class="grid-4">
            <div class="card stat-card">
                <div class="stat-value">${stats.totalClients}</div>
                <div class="stat-label">Clients actifs</div>
            </div>
            
            <div class="card stat-card">
                <div class="stat-value">${stats.devisEnCours}</div>
                <div class="stat-label">Devis en attente</div>
            </div>
            
            <div class="card stat-card">
                <div class="stat-value">${stats.facturesImpayees}</div>
                <div class="stat-label">Factures impayées</div>
            </div>
            
            <div class="card stat-card">
                <div class="stat-value">${formatCurrency(stats.caMensuel)}</div>
                <div class="stat-label">CA ce mois</div>
            </div>
        </div>
        
        <div class="grid-2">
            <div class="card">
                <h3 style="margin-bottom: 1rem;">Derniers devis</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Numéro</th>
                            <th>Client</th>
                            <th>Montant</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${devis.slice(0, 5).map(d => `
                            <tr>
                                <td>${d.numero}</td>
                                <td>${d.raison_sociale}</td>
                                <td>${formatCurrency(d.montant_ttc)}</td>
                                <td>${getStatusBadge(d.statut)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 1rem;">Dernières factures</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Numéro</th>
                            <th>Client</th>
                            <th>Montant</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${factures.slice(0, 5).map(f => `
                            <tr>
                                <td>${f.numero}</td>
                                <td>${f.raison_sociale}</td>
                                <td>${formatCurrency(f.montant_ttc)}</td>
                                <td>${getStatusBadge(f.statut, 'facture')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================================================
// Page: Clients
// ============================================================================

async function loadClients() {
    const contentArea = document.getElementById('contentArea');
    const clients = await ClientsAPI.getAll();
    
    contentArea.innerHTML = `
        <div class="page-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2>Clients</h2>
                    <p>Gestion de vos clients</p>
                </div>
                <button class="btn btn-primary" onclick="showClientModal()">
                    ➕ Nouveau client
                </button>
            </div>
        </div>
        
        <div class="card">
            <div style="margin-bottom: 1.5rem;">
                <input 
                    type="text" 
                    class="form-input" 
                    placeholder="Rechercher un client..."
                    onkeyup="searchClients(this.value)"
                >
            </div>
            
            <table class="data-table" id="clientsTable">
                <thead>
                    <tr>
                        <th>Raison sociale</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Ville</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${clients.map(c => `
                        <tr data-client-id="${c.id}">
                            <td><strong>${c.raison_sociale}</strong></td>
                            <td>${c.contact_prenom || ''} ${c.contact_nom || ''}</td>
                            <td>${c.email || '-'}</td>
                            <td>${c.ville || '-'}</td>
                            <td>
                                <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="editClient('${c.id}')">
                                    ✏️ Modifier
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function searchClients(term) {
    if (!term) {
        await loadClients();
        return;
    }
    
    const clients = await ClientsAPI.search(term);
    const tbody = document.querySelector('#clientsTable tbody');
    
    tbody.innerHTML = clients.map(c => `
        <tr data-client-id="${c.id}">
            <td><strong>${c.raison_sociale}</strong></td>
            <td>${c.contact_prenom || ''} ${c.contact_nom || ''}</td>
            <td>${c.email || '-'}</td>
            <td>${c.ville || '-'}</td>
            <td>
                <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="editClient('${c.id}')">
                    ✏️ Modifier
                </button>
            </td>
        </tr>
    `).join('');
}

let currentClientId = null;

function showClientModal(clientId = null) {
    currentClientId = clientId;
    const isEdit = clientId !== null;
    
    // Créer le modal
    const modalHTML = `
        <div class="modal-overlay" id="clientModal" onclick="closeClientModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Modifier le client' : '➕ Nouveau client'}</h3>
                    <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="closeClientModal()">
                        ✕ Fermer
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="clientForm">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="raison_sociale">
                                    Raison sociale <span style="color: var(--danger);">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="raison_sociale" 
                                    name="raison_sociale"
                                    class="form-input" 
                                    required
                                    placeholder="Ex: SARL Dupont"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="siret">SIRET</label>
                                <input 
                                    type="text" 
                                    id="siret" 
                                    name="siret"
                                    class="form-input" 
                                    maxlength="14"
                                    pattern="[0-9]{14}"
                                    placeholder="12345678901234"
                                >
                                <small style="color: var(--text-gray); font-size: 0.875rem;">14 chiffres</small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="adresse">Adresse</label>
                            <input 
                                type="text" 
                                id="adresse" 
                                name="adresse"
                                class="form-input" 
                                placeholder="Numéro et nom de rue"
                            >
                        </div>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="code_postal">Code postal</label>
                                <input 
                                    type="text" 
                                    id="code_postal" 
                                    name="code_postal"
                                    class="form-input" 
                                    maxlength="5"
                                    pattern="[0-9]{5}"
                                    placeholder="75001"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="ville">Ville</label>
                                <input 
                                    type="text" 
                                    id="ville" 
                                    name="ville"
                                    class="form-input" 
                                    placeholder="Paris"
                                >
                            </div>
                        </div>
                        
                        <h4 style="margin: 2rem 0 1rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                            Contact
                        </h4>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="contact_prenom">Prénom</label>
                                <input 
                                    type="text" 
                                    id="contact_prenom" 
                                    name="contact_prenom"
                                    class="form-input" 
                                    placeholder="Jean"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="contact_nom">Nom</label>
                                <input 
                                    type="text" 
                                    id="contact_nom" 
                                    name="contact_nom"
                                    class="form-input" 
                                    placeholder="Dupont"
                                >
                            </div>
                        </div>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="email">Email</label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    name="email"
                                    class="form-input" 
                                    placeholder="contact@entreprise.fr"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="telephone">Téléphone</label>
                                <input 
                                    type="tel" 
                                    id="telephone" 
                                    name="telephone"
                                    class="form-input" 
                                    placeholder="01 23 45 67 89"
                                >
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="notes">Notes internes</label>
                            <textarea 
                                id="notes" 
                                name="notes"
                                class="form-input" 
                                rows="3"
                                placeholder="Informations complémentaires..."
                            ></textarea>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    ${isEdit ? `
                        <button class="btn btn-outline" style="margin-right: auto; border-color: var(--danger); color: var(--danger);" onclick="deleteClient()">
                            🗑️ Supprimer
                        </button>
                    ` : ''}
                    <button class="btn btn-outline" onclick="closeClientModal()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" onclick="saveClient()">
                        ${isEdit ? '💾 Enregistrer' : '➕ Créer le client'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Ajouter le modal au body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Charger les données si édition
    if (isEdit) {
        loadClientData(clientId);
    }
    
    // Focus sur le premier champ
    setTimeout(() => {
        document.getElementById('raison_sociale').focus();
    }, 100);
}

async function loadClientData(clientId) {
    try {
        const client = await ClientsAPI.getById(clientId);
        
        // Remplir le formulaire
        document.getElementById('raison_sociale').value = client.raison_sociale || '';
        document.getElementById('siret').value = client.siret || '';
        document.getElementById('adresse').value = client.adresse || '';
        document.getElementById('code_postal').value = client.code_postal || '';
        document.getElementById('ville').value = client.ville || '';
        document.getElementById('contact_prenom').value = client.contact_prenom || '';
        document.getElementById('contact_nom').value = client.contact_nom || '';
        document.getElementById('email').value = client.email || '';
        document.getElementById('telephone').value = client.telephone || '';
        document.getElementById('notes').value = client.notes || '';
        
    } catch (error) {
        console.error('Erreur chargement client:', error);
        alert('Erreur lors du chargement des données du client');
        closeClientModal();
    }
}

async function saveClient() {
    const form = document.getElementById('clientForm');
    
    // Valider le formulaire
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Récupérer les données
    const clientData = {
        raison_sociale: document.getElementById('raison_sociale').value.trim(),
        siret: document.getElementById('siret').value.trim() || null,
        adresse: document.getElementById('adresse').value.trim() || null,
        code_postal: document.getElementById('code_postal').value.trim() || null,
        ville: document.getElementById('ville').value.trim() || null,
        contact_prenom: document.getElementById('contact_prenom').value.trim() || null,
        contact_nom: document.getElementById('contact_nom').value.trim() || null,
        email: document.getElementById('email').value.trim() || null,
        telephone: document.getElementById('telephone').value.trim() || null,
        notes: document.getElementById('notes').value.trim() || null
    };
    
    // Validation SIRET
    if (clientData.siret && clientData.siret.length !== 14) {
        alert('Le SIRET doit contenir exactement 14 chiffres');
        document.getElementById('siret').focus();
        return;
    }
    
    // Validation code postal
    if (clientData.code_postal && clientData.code_postal.length !== 5) {
        alert('Le code postal doit contenir exactement 5 chiffres');
        document.getElementById('code_postal').focus();
        return;
    }
    
    try {
        if (currentClientId) {
            // Mise à jour
            await ClientsAPI.update(currentClientId, clientData);
            showNotification('✅ Client modifié avec succès', 'success');
        } else {
            // Création
            await ClientsAPI.create(clientData);
            showNotification('✅ Client créé avec succès', 'success');
        }
        
        // Fermer le modal
        closeClientModal();
        
        // Recharger la liste des clients
        await loadClients();
        
    } catch (error) {
        console.error('Erreur sauvegarde client:', error);
        alert('Erreur lors de l\'enregistrement du client: ' + error.message);
    }
}

async function deleteClient() {
    if (!currentClientId) return;
    
    const confirmDelete = confirm(
        '⚠️ Êtes-vous sûr de vouloir supprimer ce client ?\n\n' +
        'Cette action est irréversible.\n' +
        'Le client sera archivé (non supprimé définitivement).'
    );
    
    if (!confirmDelete) return;
    
    try {
        // Archiver le client (au lieu de le supprimer)
        await ClientsAPI.archive(currentClientId);
        
        showNotification('✅ Client archivé avec succès', 'success');
        
        // Fermer le modal
        closeClientModal();
        
        // Recharger la liste
        await loadClients();
        
    } catch (error) {
        console.error('Erreur suppression client:', error);
        alert('Erreur lors de la suppression du client: ' + error.message);
    }
}

function closeClientModal(event) {
    // Si on clique sur l'overlay (fond sombre)
    if (event && event.target.id !== 'clientModal') {
        return;
    }
    
    const modal = document.getElementById('clientModal');
    if (modal) {
        modal.remove();
    }
    currentClientId = null;
}

function editClient(clientId) {
    showClientModal(clientId);
}

function showNotification(message, type = 'success') {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    // Animation CSS
    if (!document.getElementById('notificationStyle')) {
        const style = document.createElement('style');
        style.id = 'notificationStyle';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================================================
// Page: Prestations
// ============================================================================

async function loadPrestations() {
    const contentArea = document.getElementById('contentArea');
    const prestations = await PrestationsAPI.getAll(false);
    
    // Grouper par catégorie
    const grouped = prestations.reduce((acc, p) => {
        if (!acc[p.categorie]) acc[p.categorie] = [];
        acc[p.categorie].push(p);
        return acc;
    }, {});
    
    contentArea.innerHTML = `
        <div class="page-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2>Prestations</h2>
                    <p>Catalogue de vos prestations</p>
                </div>
                <button class="btn btn-primary" onclick="showPrestationModal()">
                    ➕ Nouvelle prestation
                </button>
            </div>
        </div>
        
        ${Object.entries(grouped).map(([categorie, items]) => `
            <div class="card">
                <h3 style="margin-bottom: 1rem; text-transform: capitalize;">${categorie}</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Nom</th>
                            <th>Prix unitaire</th>
                            <th>Unité</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(p => `
                            <tr>
                                <td><code>${p.code}</code></td>
                                <td>${p.nom}</td>
                                <td><strong>${formatCurrency(p.prix_unitaire)}</strong></td>
                                <td>${p.unite}</td>
                                <td>${p.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-warning">Inactive</span>'}</td>
                                <td>
                                    <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="editPrestation('${p.id}')">
                                        ✏️ Modifier
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}
    `;
}

let currentPrestationId = null;

function showPrestationModal(prestationId = null) {
    currentPrestationId = prestationId;
    const isEdit = prestationId !== null;
    
    // Créer le modal
    const modalHTML = `
        <div class="modal-overlay" id="prestationModal" onclick="closePrestationModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Modifier la prestation' : '➕ Nouvelle prestation'}</h3>
                    <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="closePrestationModal()">
                        ✕ Fermer
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="prestationForm">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="prestation_code">
                                    Code <span style="color: var(--danger);">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    id="prestation_code" 
                                    name="code"
                                    class="form-input" 
                                    required
                                    maxlength="20"
                                    placeholder="Ex: PAIE-BULL"
                                    style="text-transform: uppercase;"
                                >
                                <small style="color: var(--text-gray); font-size: 0.875rem;">
                                    Code unique pour identifier la prestation
                                </small>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="prestation_categorie">
                                    Catégorie <span style="color: var(--danger);">*</span>
                                </label>
                                <select 
                                    id="prestation_categorie" 
                                    name="categorie"
                                    class="form-input" 
                                    required
                                >
                                    <option value="">Sélectionner...</option>
                                    <option value="paie">Paie</option>
                                    <option value="parametrage">Paramétrage SILAE</option>
                                    <option value="conseil">Conseil RH</option>
                                    <option value="formation">Formation</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="prestation_nom">
                                Nom de la prestation <span style="color: var(--danger);">*</span>
                            </label>
                            <input 
                                type="text" 
                                id="prestation_nom" 
                                name="nom"
                                class="form-input" 
                                required
                                placeholder="Ex: Traitement paie sur bulletin"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="prestation_description">
                                Description
                            </label>
                            <textarea 
                                id="prestation_description" 
                                name="description"
                                class="form-input" 
                                rows="3"
                                placeholder="Description détaillée de la prestation..."
                            ></textarea>
                        </div>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="prestation_prix">
                                    Prix unitaire HT <span style="color: var(--danger);">*</span>
                                </label>
                                <input 
                                    type="number" 
                                    id="prestation_prix" 
                                    name="prix_unitaire"
                                    class="form-input" 
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                >
                                <small style="color: var(--text-gray); font-size: 0.875rem;">
                                    Prix en euros HT
                                </small>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="prestation_unite">
                                    Unité <span style="color: var(--danger);">*</span>
                                </label>
                                <select 
                                    id="prestation_unite" 
                                    name="unite"
                                    class="form-input" 
                                    required
                                >
                                    <option value="">Sélectionner...</option>
                                    <option value="bulletin">Bulletin</option>
                                    <option value="heure">Heure</option>
                                    <option value="jour">Jour</option>
                                    <option value="forfait">Forfait</option>
                                    <option value="mois">Mois</option>
                                    <option value="unite">Unité</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                                <input 
                                    type="checkbox" 
                                    id="prestation_active" 
                                    name="active"
                                    checked
                                    style="width: 20px; height: 20px; cursor: pointer;"
                                >
                                <span class="form-label" style="margin: 0;">
                                    Prestation active
                                </span>
                            </label>
                            <small style="color: var(--text-gray); font-size: 0.875rem; margin-left: 1.75rem;">
                                Les prestations inactives ne seront pas proposées lors de la création de devis
                            </small>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    ${isEdit ? `
                        <button class="btn btn-outline" style="margin-right: auto; border-color: var(--danger); color: var(--danger);" onclick="deletePrestation()">
                            🗑️ Supprimer
                        </button>
                    ` : ''}
                    <button class="btn btn-outline" onclick="closePrestationModal()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" onclick="savePrestation()">
                        ${isEdit ? '💾 Enregistrer' : '➕ Créer la prestation'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Ajouter le modal au body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Auto-uppercase pour le code
    document.getElementById('prestation_code').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    
    // Charger les données si édition
    if (isEdit) {
        loadPrestationData(prestationId);
    }
    
    // Focus sur le premier champ
    setTimeout(() => {
        document.getElementById('prestation_code').focus();
    }, 100);
}

async function loadPrestationData(prestationId) {
    try {
        const prestations = await PrestationsAPI.getAll(false);
        const prestation = prestations.find(p => p.id === prestationId);
        
        if (!prestation) {
            throw new Error('Prestation non trouvée');
        }
        
        // Remplir le formulaire
        document.getElementById('prestation_code').value = prestation.code || '';
        document.getElementById('prestation_categorie').value = prestation.categorie || '';
        document.getElementById('prestation_nom').value = prestation.nom || '';
        document.getElementById('prestation_description').value = prestation.description || '';
        document.getElementById('prestation_prix').value = prestation.prix_unitaire || '';
        document.getElementById('prestation_unite').value = prestation.unite || '';
        document.getElementById('prestation_active').checked = prestation.active;
        
        // Désactiver le code en édition (pour éviter les doublons)
        document.getElementById('prestation_code').disabled = true;
        
    } catch (error) {
        console.error('Erreur chargement prestation:', error);
        alert('Erreur lors du chargement des données de la prestation');
        closePrestationModal();
    }
}

async function savePrestation() {
    const form = document.getElementById('prestationForm');
    
    // Valider le formulaire
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Récupérer les données
    const prestationData = {
        code: document.getElementById('prestation_code').value.trim().toUpperCase(),
        categorie: document.getElementById('prestation_categorie').value,
        nom: document.getElementById('prestation_nom').value.trim(),
        description: document.getElementById('prestation_description').value.trim() || null,
        prix_unitaire: parseFloat(document.getElementById('prestation_prix').value),
        unite: document.getElementById('prestation_unite').value,
        active: document.getElementById('prestation_active').checked
    };
    
    // Validation du prix
    if (prestationData.prix_unitaire < 0) {
        alert('Le prix ne peut pas être négatif');
        document.getElementById('prestation_prix').focus();
        return;
    }
    
    try {
        if (currentPrestationId) {
            // Mise à jour (sans le code car il ne peut pas être modifié)
            const { code, ...updateData } = prestationData;
            await PrestationsAPI.update(currentPrestationId, updateData);
            showNotification('✅ Prestation modifiée avec succès', 'success');
        } else {
            // Création
            await PrestationsAPI.create(prestationData);
            showNotification('✅ Prestation créée avec succès', 'success');
        }
        
        // Fermer le modal
        closePrestationModal();
        
        // Recharger la liste des prestations
        await loadPrestations();
        
    } catch (error) {
        console.error('Erreur sauvegarde prestation:', error);
        
        // Gérer les erreurs spécifiques
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
            alert('Erreur : Ce code de prestation existe déjà. Veuillez en choisir un autre.');
            document.getElementById('prestation_code').focus();
        } else {
            alert('Erreur lors de l\'enregistrement de la prestation: ' + error.message);
        }
    }
}

async function deletePrestation() {
    if (!currentPrestationId) return;
    
    const confirmDelete = confirm(
        '⚠️ Êtes-vous sûr de vouloir supprimer cette prestation ?\n\n' +
        'Cette action est irréversible.\n' +
        'La prestation sera désactivée (non supprimée définitivement).'
    );
    
    if (!confirmDelete) return;
    
    try {
        // Désactiver la prestation au lieu de la supprimer
        await PrestationsAPI.update(currentPrestationId, { active: false });
        
        showNotification('✅ Prestation désactivée avec succès', 'success');
        
        // Fermer le modal
        closePrestationModal();
        
        // Recharger la liste
        await loadPrestations();
        
    } catch (error) {
        console.error('Erreur suppression prestation:', error);
        alert('Erreur lors de la suppression de la prestation: ' + error.message);
    }
}

function closePrestationModal(event) {
    // Si on clique sur l'overlay (fond sombre)
    if (event && event.target.id !== 'prestationModal') {
        return;
    }
    
    const modal = document.getElementById('prestationModal');
    if (modal) {
        modal.remove();
    }
    currentPrestationId = null;
}

function editPrestation(prestationId) {
    showPrestationModal(prestationId);
}

// ============================================================================
// Page: Devis
// ============================================================================

async function loadDevis() {
    const contentArea = document.getElementById('contentArea');
    const devis = await DevisAPI.getAll();
    
    contentArea.innerHTML = `
        <div class="page-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2>Devis</h2>
                    <p>Gestion de vos devis</p>
                </div>
                <button class="btn btn-primary" onclick="showDevisModal()">
                    ➕ Nouveau devis
                </button>
            </div>
        </div>
        
        <div class="card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Numéro</th>
                        <th>Client</th>
                        <th>Date émission</th>
                        <th>Validité</th>
                        <th>Montant TTC</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${devis.map(d => `
                        <tr>
                            <td><strong>${d.numero}</strong></td>
                            <td>${d.raison_sociale}</td>
                            <td>${formatDate(d.date_emission)}</td>
                            <td>${formatDate(d.date_validite)}</td>
                            <td><strong>${formatCurrency(d.montant_ttc)}</strong></td>
                            <td>${getStatusBadge(d.statut)}</td>
                            <td>
                                <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="viewDevis('${d.id}')">
                                    👁️ Voir
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

let currentDevisId = null;
let devisLignes = [];
let clientsCache = [];
let prestationsCache = [];

async function showDevisModal(devisId = null) {
    currentDevisId = devisId;
    const isEdit = devisId !== null;
    
    // Charger les données nécessaires
    clientsCache = await ClientsAPI.getAll();
    prestationsCache = await PrestationsAPI.getAll(true);
    
    // Initialiser les lignes
    if (!isEdit) {
        devisLignes = [];
    }
    
    // Créer le modal
    const modalHTML = `
        <div class="modal-overlay" id="devisModal" onclick="closeDevisModal(event)">
            <div class="modal" style="max-width: 1200px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Modifier le devis' : '📄 Nouveau devis'}</h3>
                    <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="closeDevisModal()">
                        ✕ Fermer
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="devisForm">
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="devis_client">
                                    Client <span style="color: var(--danger);">*</span>
                                </label>
                                <select 
                                    id="devis_client" 
                                    name="client_id"
                                    class="form-input" 
                                    required
                                    ${isEdit ? 'disabled' : ''}
                                >
                                    <option value="">Sélectionner un client...</option>
                                    ${clientsCache.map(c => `
                                        <option value="${c.id}">${c.raison_sociale}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="devis_statut">Statut</label>
                                <select 
                                    id="devis_statut" 
                                    name="statut"
                                    class="form-input"
                                >
                                    <option value="brouillon">📝 Brouillon</option>
                                    <option value="envoye">📤 Envoyé</option>
                                    <option value="accepte">✅ Accepté</option>
                                    <option value="refuse">❌ Refusé</option>
                                    <option value="expire">⏰ Expiré</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="devis_date_emission">Date d'émission</label>
                                <input 
                                    type="date" 
                                    id="devis_date_emission" 
                                    name="date_emission"
                                    class="form-input" 
                                    required
                                    value="${new Date().toISOString().split('T')[0]}"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="devis_date_validite">Date de validité</label>
                                <input 
                                    type="date" 
                                    id="devis_date_validite" 
                                    name="date_validite"
                                    class="form-input" 
                                    required
                                    value="${getDefaultValidityDate()}"
                                >
                                <small style="color: var(--text-gray); font-size: 0.875rem;">
                                    Validité par défaut: 30 jours
                                </small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="devis_tva">Taux de TVA (%)</label>
                            <input 
                                type="number" 
                                id="devis_tva" 
                                name="taux_tva"
                                class="form-input" 
                                value="20.00"
                                step="0.01"
                                min="0"
                                max="100"
                                onchange="calculateTotals()"
                            >
                        </div>
                        
                        <h4 style="margin: 2rem 0 1rem; padding-top: 1.5rem; border-top: 2px solid var(--border);">
                            Prestations
                        </h4>
                        
                        <div style="margin-bottom: 1rem;">
                            <button type="button" class="btn btn-primary" onclick="addLigneDevis()">
                                ➕ Ajouter une prestation
                            </button>
                        </div>
                        
                        <div id="lignesContainer">
                            <!-- Les lignes seront ajoutées ici -->
                        </div>
                        
                        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-light); border-radius: 8px;">
                            <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; max-width: 400px; margin-left: auto;">
                                <div style="text-align: right; font-weight: 500;">Total HT :</div>
                                <div id="total_ht" style="font-weight: 600; font-size: 1.1rem;">0,00 €</div>
                                
                                <div style="text-align: right; font-weight: 500;">TVA (<span id="tva_display">20</span>%) :</div>
                                <div id="total_tva" style="font-weight: 600;">0,00 €</div>
                                
                                <div style="text-align: right; font-weight: 700; font-size: 1.2rem; color: var(--primary);">Total TTC :</div>
                                <div id="total_ttc" style="font-weight: 700; font-size: 1.3rem; color: var(--primary);">0,00 €</div>
                            </div>
                        </div>
                        
                        <h4 style="margin: 2rem 0 1rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                            Informations complémentaires
                        </h4>
                        
                        <div class="form-group">
                            <label class="form-label" for="devis_notes">Notes internes</label>
                            <textarea 
                                id="devis_notes" 
                                name="notes"
                                class="form-input" 
                                rows="2"
                                placeholder="Notes visibles uniquement en interne..."
                            ></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="devis_conditions">Conditions particulières</label>
                            <textarea 
                                id="devis_conditions" 
                                name="conditions"
                                class="form-input" 
                                rows="3"
                                placeholder="Conditions spécifiques à ce devis..."
                            ></textarea>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    ${isEdit ? `
                        <button class="btn" style="background: #10b981; color: white; border: 2px solid #10b981; font-weight: 600;" onclick="genererPDFDevis('${currentDevisId}')">
                            📄 Générer PDF
                        </button>
                        <button class="btn" style="background: #f59e0b; color: white; border: 2px solid #f59e0b; font-weight: 600;" onclick="convertirEnFacture('${currentDevisId}')">
                            🔄 Convertir en facture
                        </button>
                        <button class="btn btn-outline" style="border: 2px solid var(--danger); color: var(--danger); font-weight: 600;" onclick="deleteDevis()">
                            🗑️ Supprimer
                        </button>
                    ` : ''}
                    <button class="btn btn-outline" style="border: 2px solid var(--border); font-weight: 500;" onclick="closeDevisModal()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" style="border: 2px solid var(--primary); font-weight: 600;" onclick="saveDevis()">
                        ${isEdit ? '💾 Enregistrer' : '✅ Créer le devis'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (isEdit) {
        await loadDevisData(devisId);
    }
    
    if (!isEdit) {
        addLigneDevis();
    }
}

function getDefaultValidityDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
}

async function loadDevisData(devisId) {
    try {
        const devis = await DevisAPI.getById(devisId);
        
        document.getElementById('devis_client').value = devis.client_id;
        document.getElementById('devis_statut').value = devis.statut;
        document.getElementById('devis_date_emission').value = devis.date_emission;
        document.getElementById('devis_date_validite').value = devis.date_validite;
        document.getElementById('devis_tva').value = devis.taux_tva;
        document.getElementById('devis_notes').value = devis.notes || '';
        document.getElementById('devis_conditions').value = devis.conditions || '';
        
        // Vider le tableau avant de charger les lignes
        devisLignes = [];
        
        // Afficher chaque ligne existante
        (devis.lignes || []).forEach(ligne => {
            addLigneDevis(ligne);
        });
        
        calculateTotals();
        
    } catch (error) {
        console.error('Erreur chargement devis:', error);
        alert('Erreur lors du chargement du devis');
        closeDevisModal();
    }
}

function addLigneDevis(ligneData = null) {
    const ligneIndex = devisLignes.length;
    
    const ligne = ligneData || {
        prestation_id: '',
        description: '',
        quantite: 1,
        prix_unitaire: 0,
        remise_pourcent: 0,
        montant_ht: 0
    };
    
    devisLignes.push(ligne);
    
    const ligneHTML = `
        <div class="card" style="margin-bottom: 1rem; padding: 1rem;" id="ligne_${ligneIndex}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h5 style="margin: 0;">Ligne ${ligneIndex + 1}</h5>
                <button type="button" class="btn btn-outline" style="padding: 0.25rem 0.75rem; border-color: var(--danger); color: var(--danger);" onclick="removeLigneDevis(${ligneIndex})">
                    ✕ Supprimer
                </button>
            </div>
            
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">Prestation</label>
                    <select 
                        class="form-input" 
                        onchange="selectPrestation(${ligneIndex}, this.value)"
                        data-ligne="${ligneIndex}"
                    >
                        <option value="">Sélectionner...</option>
                        ${prestationsCache.map(p => `
                            <option value="${p.id}" ${ligne.prestation_id === p.id ? 'selected' : ''}>
                                ${p.nom} - ${formatCurrency(p.prix_unitaire)} / ${p.unite}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        value="${ligne.description || ''}"
                        onchange="updateLigneDescription(${ligneIndex}, this.value)"
                        placeholder="Description"
                    >
                </div>
            </div>
            
            <div class="grid-2" style="grid-template-columns: repeat(4, 1fr);">
                <div class="form-group">
                    <label class="form-label">Quantité</label>
                    <input 
                        type="number" 
                        class="form-input" 
                        value="${ligne.quantite}"
                        min="0"
                        step="0.01"
                        onchange="updateLigneQuantite(${ligneIndex}, this.value)"
                    >
                </div>
                
                <div class="form-group">
                    <label class="form-label">Prix unitaire HT</label>
                    <input 
                        type="number" 
                        class="form-input" 
                        value="${ligne.prix_unitaire}"
                        min="0"
                        step="0.01"
                        onchange="updateLignePrix(${ligneIndex}, this.value)"
                    >
                </div>
                
                <div class="form-group">
                    <label class="form-label">Remise (%)</label>
                    <input 
                        type="number" 
                        class="form-input" 
                        value="${ligne.remise_pourcent}"
                        min="0"
                        max="100"
                        step="0.01"
                        onchange="updateLigneRemise(${ligneIndex}, this.value)"
                    >
                </div>
                
                <div class="form-group">
                    <label class="form-label">Montant HT</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        value="${formatCurrency(ligne.montant_ht)}"
                        disabled
                        style="background: var(--bg-light); font-weight: 600;"
                    >
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lignesContainer').insertAdjacentHTML('beforeend', ligneHTML);
    calculateTotals();
}

function selectPrestation(ligneIndex, prestationId) {
    if (!prestationId) return;
    
    const prestation = prestationsCache.find(p => p.id === prestationId);
    if (!prestation) return;
    
    devisLignes[ligneIndex].prestation_id = prestationId;
    devisLignes[ligneIndex].description = prestation.nom;
    devisLignes[ligneIndex].prix_unitaire = prestation.prix_unitaire;
    
    const ligne = document.getElementById(`ligne_${ligneIndex}`);
    ligne.querySelector('input[placeholder="Description"]').value = prestation.nom;
    ligne.querySelectorAll('input[type="number"]')[1].value = prestation.prix_unitaire;
    
    calculateLigneMontant(ligneIndex);
}

function updateLigneDescription(ligneIndex, value) {
    devisLignes[ligneIndex].description = value;
}

function updateLigneQuantite(ligneIndex, value) {
    devisLignes[ligneIndex].quantite = parseFloat(value) || 0;
    calculateLigneMontant(ligneIndex);
}

function updateLignePrix(ligneIndex, value) {
    devisLignes[ligneIndex].prix_unitaire = parseFloat(value) || 0;
    calculateLigneMontant(ligneIndex);
}

function updateLigneRemise(ligneIndex, value) {
    devisLignes[ligneIndex].remise_pourcent = parseFloat(value) || 0;
    calculateLigneMontant(ligneIndex);
}

function calculateLigneMontant(ligneIndex) {
    const ligne = devisLignes[ligneIndex];
    const montantAvantRemise = ligne.quantite * ligne.prix_unitaire;
    const montantRemise = montantAvantRemise * (ligne.remise_pourcent / 100);
    ligne.montant_ht = montantAvantRemise - montantRemise;
    
    const ligneElement = document.getElementById(`ligne_${ligneIndex}`);
    if (ligneElement) {
        ligneElement.querySelector('input[disabled]').value = formatCurrency(ligne.montant_ht);
    }
    
    calculateTotals();
}

function removeLigneDevis(ligneIndex) {
    if (confirm('Supprimer cette ligne ?')) {
        devisLignes.splice(ligneIndex, 1);
        document.getElementById(`ligne_${ligneIndex}`).remove();
        
        document.querySelectorAll('#lignesContainer .card').forEach((card, index) => {
            card.querySelector('h5').textContent = `Ligne ${index + 1}`;
        });
        
        calculateTotals();
    }
}

function calculateTotals() {
    const tauxTVA = parseFloat(document.getElementById('devis_tva')?.value || 20);
    
    const totalHT = devisLignes.reduce((sum, ligne) => sum + (ligne.montant_ht || 0), 0);
    const totalTVA = totalHT * (tauxTVA / 100);
    const totalTTC = totalHT + totalTVA;
    
    if (document.getElementById('total_ht')) {
        document.getElementById('total_ht').textContent = formatCurrency(totalHT);
        document.getElementById('total_tva').textContent = formatCurrency(totalTVA);
        document.getElementById('total_ttc').textContent = formatCurrency(totalTTC);
        document.getElementById('tva_display').textContent = tauxTVA.toFixed(2);
    }
}

async function saveDevis() {
    const form = document.getElementById('devisForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    if (devisLignes.length === 0) {
        alert('Veuillez ajouter au moins une prestation');
        return;
    }
    
    const lignesValides = devisLignes.every(l => l.prestation_id && l.quantite > 0);
    if (!lignesValides) {
        alert('Toutes les lignes doivent avoir une prestation et une quantité > 0');
        return;
    }
    
    const tauxTVA = parseFloat(document.getElementById('devis_tva').value);
    const totalHT = devisLignes.reduce((sum, ligne) => sum + ligne.montant_ht, 0);
    const totalTVA = totalHT * (tauxTVA / 100);
    const totalTTC = totalHT + totalTVA;
    
    const devisData = {
        client_id: document.getElementById('devis_client').value,
        date_emission: document.getElementById('devis_date_emission').value,
        date_validite: document.getElementById('devis_date_validite').value,
        statut: document.getElementById('devis_statut').value,
        taux_tva: tauxTVA,
        montant_ht: totalHT,
        montant_tva: totalTVA,
        montant_ttc: totalTTC,
        notes: document.getElementById('devis_notes').value || null,
        conditions: document.getElementById('devis_conditions').value || null
    };
    
    try {
        let devisId;
        
        if (currentDevisId) {
            await DevisAPI.update(currentDevisId, devisData);
            devisId = currentDevisId;
            
            const devis = await DevisAPI.getById(currentDevisId);
            for (const ligne of devis.lignes) {
                await DevisAPI.deleteLigne(ligne.id);
            }
            
            showNotification('✅ Devis modifié avec succès', 'success');
        } else {
            const result = await DevisAPI.create(devisData);
            devisId = result.id;
            showNotification('✅ Devis créé avec succès', 'success');
        }
        
        for (let i = 0; i < devisLignes.length; i++) {
            const ligne = devisLignes[i];
            await DevisAPI.addLigne(devisId, {
                prestation_id: ligne.prestation_id,
                description: ligne.description,
                quantite: ligne.quantite,
                prix_unitaire: ligne.prix_unitaire,
                remise_pourcent: ligne.remise_pourcent,
                montant_ht: ligne.montant_ht,  // <-- Ajouter cette ligne !
                ordre: i
            });
        }
        
        closeDevisModal();
        await loadDevis();
        
    } catch (error) {
        console.error('Erreur sauvegarde devis:', error);
        alert('Erreur: ' + error.message);
    }
}

async function deleteDevis() {
    if (!currentDevisId) return;
    
    if (!confirm('⚠️ Supprimer ce devis ?')) return;
    
    try {
        await supabase.from('devis').delete().eq('id', currentDevisId);
        showNotification('✅ Devis supprimé', 'success');
        closeDevisModal();
        await loadDevis();
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur: ' + error.message);
    }
}

function convertirEnFacture(devisId) {
    if (confirm('🔄 Convertir ce devis en facture ?\n\nLe devis passera en statut "Accepté" et une nouvelle facture sera créée avec les mêmes prestations.')) {
        closeDevisModal();
        showFactureModal(null, devisId);
    }
}

function closeDevisModal(event) {
    if (event && event.target.id !== 'devisModal') return;
    
    const modal = document.getElementById('devisModal');
    if (modal) modal.remove();
    currentDevisId = null;
    devisLignes = [];
}

function viewDevis(devisId) {
    showDevisModal(devisId);
}

// ============================================================================
// Page: Factures
// ============================================================================

async function loadFactures() {
    const contentArea = document.getElementById('contentArea');
    const factures = await FacturesAPI.getAll();
    
    contentArea.innerHTML = `
        <div class="page-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2>Factures</h2>
                    <p>Gestion de vos factures</p>
                </div>
                <button class="btn btn-primary" onclick="showFactureModal()">
                    ➕ Nouvelle facture
                </button>
            </div>
        </div>
        
        <div class="card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Numéro</th>
                        <th>Client</th>
                        <th>Date émission</th>
                        <th>Échéance</th>
                        <th>Montant TTC</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${factures.map(f => `
                        <tr>
                            <td><strong>${f.numero}</strong></td>
                            <td>${f.raison_sociale}</td>
                            <td>${formatDate(f.date_emission)}</td>
                            <td>${formatDate(f.date_echeance)}</td>
                            <td><strong>${formatCurrency(f.montant_ttc)}</strong></td>
                            <td>${getStatusBadge(f.statut, 'facture')}</td>
                            <td>
                                <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="viewFacture('${f.id}')">
                                    👁️ Voir
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

let currentFactureId = null;
let factureLignes = [];
let factureFromDevisId = null;

async function showFactureModal(factureId = null, devisId = null) {
    currentFactureId = factureId;
    factureFromDevisId = devisId;
    const isEdit = factureId !== null;
    const fromDevis = devisId !== null;
    
    // Charger les données nécessaires
    clientsCache = await ClientsAPI.getAll();
    prestationsCache = await PrestationsAPI.getAll(true);
    
    // Initialiser les lignes
    if (!isEdit && !fromDevis) {
        factureLignes = [];
    }
    
    // Si depuis un devis, charger les données du devis
    let devisData = null;
    if (fromDevis) {
        devisData = await DevisAPI.getById(devisId);
    }
    
    // Créer le modal
    const modalHTML = `
        <div class="modal-overlay" id="factureModal" onclick="closeFactureModal(event)">
            <div class="modal" style="max-width: 1200px;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Modifier la facture' : fromDevis ? '🔄 Nouvelle facture depuis devis' : '🧾 Nouvelle facture'}</h3>
                    <button class="btn btn-outline" style="padding: 0.5rem 1rem;" onclick="closeFactureModal()">
                        ✕ Fermer
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="factureForm">
                        ${fromDevis ? `
                            <div style="background: var(--bg-light); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                                ℹ️ Facture créée depuis le devis <strong>${devisData.numero}</strong>
                            </div>
                        ` : ''}
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="facture_client">
                                    Client <span style="color: var(--danger);">*</span>
                                </label>
                                <select 
                                    id="facture_client" 
                                    name="client_id"
                                    class="form-input" 
                                    required
                                    ${isEdit || fromDevis ? 'disabled' : ''}
                                >
                                    <option value="">Sélectionner un client...</option>
                                    ${clientsCache.map(c => `
                                        <option value="${c.id}" ${fromDevis && c.id === devisData.client_id ? 'selected' : ''}>
                                            ${c.raison_sociale}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="facture_statut">Statut</label>
                                <select 
                                    id="facture_statut" 
                                    name="statut"
                                    class="form-input"
                                >
                                    <option value="brouillon">📝 Brouillon</option>
                                    <option value="envoyee">📤 Envoyée</option>
                                    <option value="payee">✅ Payée</option>
                                    <option value="partiel">💸 Paiement partiel</option>
                                    <option value="retard">⏰ En retard</option>
                                    <option value="annulee">❌ Annulée</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="facture_date_emission">Date d'émission</label>
                                <input 
                                    type="date" 
                                    id="facture_date_emission" 
                                    name="date_emission"
                                    class="form-input" 
                                    required
                                    value="${new Date().toISOString().split('T')[0]}"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="facture_date_echeance">Date d'échéance</label>
                                <input 
                                    type="date" 
                                    id="facture_date_echeance" 
                                    name="date_echeance"
                                    class="form-input" 
                                    required
                                    value="${getDefaultEcheanceDate()}"
                                >
                                <small style="color: var(--text-gray); font-size: 0.875rem;">
                                    Échéance par défaut: 30 jours
                                </small>
                            </div>
                        </div>
                        
                        <div class="grid-2">
                            <div class="form-group">
                                <label class="form-label" for="facture_tva">Taux de TVA (%)</label>
                                <input 
                                    type="number" 
                                    id="facture_tva" 
                                    name="taux_tva"
                                    class="form-input" 
                                    value="${fromDevis ? devisData.taux_tva : '20.00'}"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    onchange="calculateFactureTotals()"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" for="facture_montant_paye">Montant payé</label>
                                <input 
                                    type="number" 
                                    id="facture_montant_paye" 
                                    name="montant_paye"
                                    class="form-input" 
                                    value="0.00"
                                    step="0.01"
                                    min="0"
                                    onchange="updateStatutPaiement()"
                                >
                                <small style="color: var(--text-gray); font-size: 0.875rem;">
                                    Montant déjà encaissé
                                </small>
                            </div>
                        </div>
                        
                        <h4 style="margin: 2rem 0 1rem; padding-top: 1.5rem; border-top: 2px solid var(--border);">
                            Prestations
                        </h4>
                        
                        <div style="margin-bottom: 1rem;">
                            <button type="button" class="btn btn-primary" onclick="addLigneFacture()">
                                ➕ Ajouter une prestation
                            </button>
                        </div>
                        
                        <div id="lignesFactureContainer">
                            <!-- Les lignes seront ajoutées ici -->
                        </div>
                        
                        <div style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-light); border-radius: 8px;">
                            <div style="display: grid; grid-template-columns: 1fr auto; gap: 1rem; max-width: 400px; margin-left: auto;">
                                <div style="text-align: right; font-weight: 500;">Total HT :</div>
                                <div id="facture_total_ht" style="font-weight: 600; font-size: 1.1rem;">0,00 €</div>
                                
                                <div style="text-align: right; font-weight: 500;">TVA (<span id="facture_tva_display">20</span>%) :</div>
                                <div id="facture_total_tva" style="font-weight: 600;">0,00 €</div>
                                
                                <div style="text-align: right; font-weight: 700; font-size: 1.2rem; color: var(--primary);">Total TTC :</div>
                                <div id="facture_total_ttc" style="font-weight: 700; font-size: 1.3rem; color: var(--primary);">0,00 €</div>
                                
                                <div style="text-align: right; font-weight: 500; color: var(--danger);">Déjà payé :</div>
                                <div id="facture_deja_paye" style="font-weight: 600; color: var(--danger);">0,00 €</div>
                                
                                <div style="text-align: right; font-weight: 700; font-size: 1.1rem; color: var(--warning); border-top: 2px solid var(--border); padding-top: 0.5rem;">Reste à payer :</div>
                                <div id="facture_reste_payer" style="font-weight: 700; font-size: 1.2rem; color: var(--warning); border-top: 2px solid var(--border); padding-top: 0.5rem;">0,00 €</div>
                            </div>
                        </div>
                        
                        <h4 style="margin: 2rem 0 1rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                            Informations complémentaires
                        </h4>
                        
                        <div class="form-group">
                            <label class="form-label" for="facture_notes">Notes internes</label>
                            <textarea 
                                id="facture_notes" 
                                name="notes"
                                class="form-input" 
                                rows="2"
                                placeholder="Notes visibles uniquement en interne..."
                            ></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label" for="facture_conditions">Conditions de règlement</label>
                            <textarea 
                                id="facture_conditions" 
                                name="conditions_reglement"
                                class="form-input" 
                                rows="3"
                                placeholder="Paiement à 30 jours. Pas d'escompte pour paiement anticipé..."
                            ></textarea>
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    ${isEdit ? `
                        <button class="btn" style="background: #10b981; color: white; border: 2px solid #10b981; font-weight: 600;" onclick="genererPDFFacture('${currentFactureId}')">
                            📄 Générer PDF
                        </button>
                        <button class="btn btn-outline" style="border: 2px solid var(--danger); color: var(--danger); font-weight: 600;" onclick="deleteFacture()">
                            🗑️ Supprimer
                        </button>
                    ` : ''}
                    <button class="btn btn-outline" style="border: 2px solid var(--border); font-weight: 500;" onclick="closeFactureModal()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" style="border: 2px solid var(--primary); font-weight: 600;" onclick="saveFacture()">
                        ${isEdit ? '💾 Enregistrer' : '✅ Créer la facture'}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (isEdit) {
        await loadFactureData(factureId);
    } else if (fromDevis) {
        // Charger les lignes depuis le devis
        factureLignes = [];
        devisData.lignes.forEach(ligne => {
            addLigneFacture({
                prestation_id: ligne.prestation_id,
                description: ligne.description,
                quantite: ligne.quantite,
                prix_unitaire: ligne.prix_unitaire,
                remise_pourcent: ligne.remise_pourcent,
                montant_ht: ligne.montant_ht
            });
        });
        
        // Copier les notes et conditions
        document.getElementById('facture_notes').value = devisData.notes || '';
        document.getElementById('facture_conditions').value = devisData.conditions || 'Paiement à 30 jours.';
    } else {
        addLigneFacture();
    }
}

function getDefaultEcheanceDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
}

async function loadFactureData(factureId) {
    try {
        const facture = await FacturesAPI.getById(factureId);
        
        document.getElementById('facture_client').value = facture.client_id;
        document.getElementById('facture_statut').value = facture.statut;
        document.getElementById('facture_date_emission').value = facture.date_emission;
        document.getElementById('facture_date_echeance').value = facture.date_echeance;
        document.getElementById('facture_tva').value = facture.taux_tva;
        document.getElementById('facture_montant_paye').value = facture.montant_paye || 0;
        document.getElementById('facture_notes').value = facture.notes || '';
        document.getElementById('facture_conditions').value = facture.conditions_reglement || '';
        
        factureLignes = [];
        (facture.lignes || []).forEach(ligne => {
            addLigneFacture(ligne);
        });
        
        calculateFactureTotals();
        
    } catch (error) {
        console.error('Erreur chargement facture:', error);
        alert('Erreur lors du chargement de la facture');
        closeFactureModal();
    }
}

function addLigneFacture(ligneData = null) {
    const ligneIndex = factureLignes.length;
    
    const ligne = ligneData || {
        prestation_id: '',
        description: '',
        quantite: 1,
        prix_unitaire: 0,
        remise_pourcent: 0,
        montant_ht: 0
    };
    
    factureLignes.push(ligne);
    
    const ligneHTML = `
        <div class="card" style="margin-bottom: 1rem; padding: 1rem;" id="ligne_facture_${ligneIndex}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h5 style="margin: 0;">Ligne ${ligneIndex + 1}</h5>
                <button type="button" class="btn btn-outline" style="padding: 0.25rem 0.75rem; border-color: var(--danger); color: var(--danger);" onclick="removeLigneFacture(${ligneIndex})">
                    ✕ Supprimer
                </button>
            </div>
            
            <div class="grid-2">
                <div class="form-group">
                    <label class="form-label">Prestation</label>
                    <select 
                        class="form-input" 
                        onchange="selectPrestationFacture(${ligneIndex}, this.value)"
                    >
                        <option value="">Sélectionner...</option>
                        ${prestationsCache.map(p => `
                            <option value="${p.id}" ${ligne.prestation_id === p.id ? 'selected' : ''}>
                                ${p.nom} - ${formatCurrency(p.prix_unitaire)} / ${p.unite}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        value="${ligne.description || ''}"
                        onchange="updateLigneFactureDescription(${ligneIndex}, this.value)"
                        placeholder="Description"
                    >
                </div>
            </div>
            
            <div class="grid-2" style="grid-template-columns: repeat(4, 1fr);">
                <div class="form-group">
                    <label class="form-label">Quantité</label>
                    <input 
                        type="number" 
                        class="form-input" 
                        value="${ligne.quantite}"
                        min="0"
                        step="0.01"
                        onchange="updateLigneFactureQuantite(${ligneIndex}, this.value)"
                    >
                </div>
                
                <div class="form-group">
                    <label class="form-label">Prix unitaire HT</label>
                    <input 
                        type="number" 
                        class="form-input" 
                        value="${ligne.prix_unitaire}"
                        min="0"
                        step="0.01"
                        onchange="updateLigneFacturePrix(${ligneIndex}, this.value)"
                    >
                </div>
                
                <div class="form-group">
                    <label class="form-label">Remise (%)</label>
                    <input 
                        type="number" 
                        class="form-input" 
                        value="${ligne.remise_pourcent}"
                        min="0"
                        max="100"
                        step="0.01"
                        onchange="updateLigneFactureRemise(${ligneIndex}, this.value)"
                    >
                </div>
                
                <div class="form-group">
                    <label class="form-label">Montant HT</label>
                    <input 
                        type="text" 
                        class="form-input" 
                        value="${formatCurrency(ligne.montant_ht)}"
                        disabled
                        style="background: var(--bg-light); font-weight: 600;"
                    >
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lignesFactureContainer').insertAdjacentHTML('beforeend', ligneHTML);
    calculateFactureTotals();
}

function selectPrestationFacture(ligneIndex, prestationId) {
    if (!prestationId) return;
    
    const prestation = prestationsCache.find(p => p.id === prestationId);
    if (!prestation) return;
    
    factureLignes[ligneIndex].prestation_id = prestationId;
    factureLignes[ligneIndex].description = prestation.nom;
    factureLignes[ligneIndex].prix_unitaire = prestation.prix_unitaire;
    
    const ligne = document.getElementById(`ligne_facture_${ligneIndex}`);
    ligne.querySelector('input[placeholder="Description"]').value = prestation.nom;
    ligne.querySelectorAll('input[type="number"]')[1].value = prestation.prix_unitaire;
    
    calculateLigneFactureMontant(ligneIndex);
}

function updateLigneFactureDescription(ligneIndex, value) {
    factureLignes[ligneIndex].description = value;
}

function updateLigneFactureQuantite(ligneIndex, value) {
    factureLignes[ligneIndex].quantite = parseFloat(value) || 0;
    calculateLigneFactureMontant(ligneIndex);
}

function updateLigneFacturePrix(ligneIndex, value) {
    factureLignes[ligneIndex].prix_unitaire = parseFloat(value) || 0;
    calculateLigneFactureMontant(ligneIndex);
}

function updateLigneFactureRemise(ligneIndex, value) {
    factureLignes[ligneIndex].remise_pourcent = parseFloat(value) || 0;
    calculateLigneFactureMontant(ligneIndex);
}

function calculateLigneFactureMontant(ligneIndex) {
    const ligne = factureLignes[ligneIndex];
    const montantAvantRemise = ligne.quantite * ligne.prix_unitaire;
    const montantRemise = montantAvantRemise * (ligne.remise_pourcent / 100);
    ligne.montant_ht = montantAvantRemise - montantRemise;
    
    const ligneElement = document.getElementById(`ligne_facture_${ligneIndex}`);
    if (ligneElement) {
        ligneElement.querySelector('input[disabled]').value = formatCurrency(ligne.montant_ht);
    }
    
    calculateFactureTotals();
}

function removeLigneFacture(ligneIndex) {
    if (confirm('Supprimer cette ligne ?')) {
        factureLignes.splice(ligneIndex, 1);
        document.getElementById(`ligne_facture_${ligneIndex}`).remove();
        
        document.querySelectorAll('#lignesFactureContainer .card').forEach((card, index) => {
            card.querySelector('h5').textContent = `Ligne ${index + 1}`;
        });
        
        calculateFactureTotals();
    }
}

function calculateFactureTotals() {
    const tauxTVA = parseFloat(document.getElementById('facture_tva')?.value || 20);
    const montantPaye = parseFloat(document.getElementById('facture_montant_paye')?.value || 0);
    
    const totalHT = factureLignes.reduce((sum, ligne) => sum + (ligne.montant_ht || 0), 0);
    const totalTVA = totalHT * (tauxTVA / 100);
    const totalTTC = totalHT + totalTVA;
    const restePayer = totalTTC - montantPaye;
    
    if (document.getElementById('facture_total_ht')) {
        document.getElementById('facture_total_ht').textContent = formatCurrency(totalHT);
        document.getElementById('facture_total_tva').textContent = formatCurrency(totalTVA);
        document.getElementById('facture_total_ttc').textContent = formatCurrency(totalTTC);
        document.getElementById('facture_tva_display').textContent = tauxTVA.toFixed(2);
        document.getElementById('facture_deja_paye').textContent = formatCurrency(montantPaye);
        document.getElementById('facture_reste_payer').textContent = formatCurrency(restePayer);
    }
}

function updateStatutPaiement() {
    calculateFactureTotals();
    
    const totalTTC = factureLignes.reduce((sum, ligne) => {
        const totalHT = sum + (ligne.montant_ht || 0);
        return totalHT;
    }, 0) * (1 + parseFloat(document.getElementById('facture_tva')?.value || 20) / 100);
    
    const montantPaye = parseFloat(document.getElementById('facture_montant_paye')?.value || 0);
    const statutSelect = document.getElementById('facture_statut');
    
    if (montantPaye >= totalTTC) {
        statutSelect.value = 'payee';
    } else if (montantPaye > 0) {
        statutSelect.value = 'partiel';
    }
}

async function saveFacture() {
    const form = document.getElementById('factureForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    if (factureLignes.length === 0) {
        alert('Veuillez ajouter au moins une prestation');
        return;
    }
    
    const lignesValides = factureLignes.every(l => l.prestation_id && l.quantite > 0);
    if (!lignesValides) {
        alert('Toutes les lignes doivent avoir une prestation et une quantité > 0');
        return;
    }
    
    const tauxTVA = parseFloat(document.getElementById('facture_tva').value);
    const totalHT = factureLignes.reduce((sum, ligne) => sum + ligne.montant_ht, 0);
    const totalTVA = totalHT * (tauxTVA / 100);
    const totalTTC = totalHT + totalTVA;
    const montantPaye = parseFloat(document.getElementById('facture_montant_paye').value);
    
    const factureData = {
        client_id: document.getElementById('facture_client').value,
        date_emission: document.getElementById('facture_date_emission').value,
        date_echeance: document.getElementById('facture_date_echeance').value,
        statut: document.getElementById('facture_statut').value,
        taux_tva: tauxTVA,
        montant_ht: totalHT,
        montant_tva: totalTVA,
        montant_ttc: totalTTC,
        montant_paye: montantPaye,
        notes: document.getElementById('facture_notes').value || null,
        conditions_reglement: document.getElementById('facture_conditions').value || null
    };
    
    if (factureFromDevisId) {
        factureData.devis_id = factureFromDevisId;
    }
    
    try {
        let factureId;
        
        if (currentFactureId) {
            await FacturesAPI.update(currentFactureId, factureData);
            factureId = currentFactureId;
            
            const facture = await FacturesAPI.getById(currentFactureId);
            for (const ligne of facture.lignes) {
                await supabase.from('lignes_factures').delete().eq('id', ligne.id);
            }
            
            showNotification('✅ Facture modifiée avec succès', 'success');
        } else {
            const result = await FacturesAPI.create(factureData);
            factureId = result.id;
            
            // Si depuis un devis, mettre à jour le statut du devis
            if (factureFromDevisId) {
                await DevisAPI.update(factureFromDevisId, { statut: 'accepte' });
            }
            
            showNotification('✅ Facture créée avec succès', 'success');
        }
        
        for (let i = 0; i < factureLignes.length; i++) {
            const ligne = factureLignes[i];
            await FacturesAPI.addLigne(factureId, {
                prestation_id: ligne.prestation_id,
                description: ligne.description,
                quantite: ligne.quantite,
                prix_unitaire: ligne.prix_unitaire,
                remise_pourcent: ligne.remise_pourcent,
                montant_ht: ligne.montant_ht,  // <-- Ajouter cette ligne !
                ordre: i
            });
        }
        
        closeFactureModal();
        await loadFactures();
        
    } catch (error) {
        console.error('Erreur sauvegarde facture:', error);
        alert('Erreur: ' + error.message);
    }
}

async function deleteFacture() {
    if (!currentFactureId) return;
    
    if (!confirm('⚠️ Supprimer cette facture ?')) return;
    
    try {
        await supabase.from('factures').delete().eq('id', currentFactureId);
        showNotification('✅ Facture supprimée', 'success');
        closeFactureModal();
        await loadFactures();
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur: ' + error.message);
    }
}

function closeFactureModal(event) {
    if (event && event.target.id !== 'factureModal') return;
    
    const modal = document.getElementById('factureModal');
    if (modal) modal.remove();
    currentFactureId = null;
    factureLignes = [];
    factureFromDevisId = null;
}

function viewFacture(factureId) {
    showFactureModal(factureId);
}

// ============================================================================
// Page: Paramètres
// ============================================================================

async function loadParametres() {
    const contentArea = document.getElementById('contentArea');
    
    // Charger les paramètres
    const parametres = await ParametresAPI.get();
    
    contentArea.innerHTML = `
        <div class="page-header">
            <div>
                <h2>⚙️ Paramètres</h2>
                <p>Configuration de votre entreprise et personnalisation</p>
            </div>
        </div>
        
        <div class="card" style="max-width: 800px;">
            <h3 style="margin-bottom: 1.5rem;">🖼️ Logo de l'entreprise</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <!-- Zone d'upload -->
                <div>
                    <label class="form-label">Upload du logo</label>
                    <div 
                        id="dropZone" 
                        style="
                            border: 2px dashed var(--border);
                            border-radius: 8px;
                            padding: 2rem;
                            text-align: center;
                            cursor: pointer;
                            transition: all 0.3s;
                            background: var(--bg-light);
                        "
                        onclick="document.getElementById('logoInput').click()"
                    >
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📤</div>
                        <p style="font-weight: 500; margin-bottom: 0.5rem;">
                            Cliquez ou glissez-déposez
                        </p>
                        <p style="font-size: 0.875rem; color: var(--text-gray);">
                            PNG, JPG ou SVG (max 2MB)
                        </p>
                    </div>
                    <input 
                        type="file" 
                        id="logoInput" 
                        accept="image/*" 
                        style="display: none;"
                        onchange="handleLogoUpload(event)"
                    >
                    
                    <div style="margin-top: 1rem;">
                        <small style="color: var(--text-gray);">
                            <strong>Recommandations :</strong><br>
                            • Format carré ou paysage<br>
                            • Résolution : 300x300px minimum<br>
                            • Fond transparent de préférence
                        </small>
                    </div>
                </div>
                
                <!-- Aperçu -->
                <div>
                    <label class="form-label">Aperçu</label>
                    <div 
                        id="logoPreview" 
                        style="
                            border: 1px solid var(--border);
                            border-radius: 8px;
                            padding: 2rem;
                            text-align: center;
                            background: white;
                            min-height: 200px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        "
                    >
                        ${parametres.logo_base64 ? `
                            <img 
                                src="${parametres.logo_base64}" 
                                alt="Logo" 
                                style="max-width: 100%; max-height: 150px; object-fit: contain;"
                            >
                        ` : `
                            <p style="color: var(--text-gray);">Aucun logo</p>
                        `}
                    </div>
                    
                    ${parametres.logo_base64 ? `
                        <div style="margin-top: 1rem;">
                            <div style="font-size: 0.875rem; color: var(--text-gray); margin-bottom: 0.5rem;">
                                📄 ${parametres.logo_filename || 'logo'}<br>
                                💾 ${formatBytes(parametres.logo_size || 0)}
                            </div>
                            <button 
                                class="btn btn-outline" 
                                style="border: 2px solid var(--danger); color: var(--danger); width: 100%; font-weight: 600;"
                                onclick="deleteLogo()"
                            >
                                🗑️ Supprimer le logo
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div style="padding: 1rem; background: var(--bg-light); border-radius: 8px; border-left: 4px solid var(--primary);">
                <p style="margin: 0; font-size: 0.875rem;">
                    <strong>ℹ️ Information :</strong> Le logo sera automatiquement ajouté en haut de tous vos devis et factures PDF.
                </p>
            </div>
        </div>
    `;
    
    // Setup drag and drop
    setupDragAndDrop();
}

// ============================================================================
// Fonctions pour l'upload de logo
// ============================================================================

function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    
    if (!dropZone) return;
    
    // Empêcher le comportement par défaut du navigateur
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight lors du drag
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = 'var(--primary)';
            dropZone.style.background = 'var(--primary-light)';
            dropZone.style.opacity = '0.1';
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = 'var(--border)';
            dropZone.style.background = 'var(--bg-light)';
            dropZone.style.opacity = '1';
        });
    });
    
    // Gérer le drop
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleLogoFile(files[0]);
        }
    });
}

async function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        await handleLogoFile(file);
    }
}

async function handleLogoFile(file) {
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
        alert('⚠️ Veuillez sélectionner une image (PNG, JPG, SVG, etc.)');
        return;
    }
    
    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('⚠️ Le fichier est trop volumineux. Taille maximum : 2MB');
        return;
    }
    
    try {
        // Convertir en base64
        const base64 = await fileToBase64(file);
        
        // Sauvegarder dans Supabase
        await ParametresAPI.updateLogo(base64, file.name, file.size);
        
        // Afficher l'aperçu
        updateLogoPreview(base64, file.name, file.size);
        
        showNotification('✅ Logo enregistré avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur upload logo:', error);
        alert('❌ Erreur lors de l\'enregistrement du logo: ' + error.message);
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function updateLogoPreview(base64, filename, size) {
    const preview = document.getElementById('logoPreview');
    if (!preview) return;
    
    preview.innerHTML = `
        <img 
            src="${base64}" 
            alt="Logo" 
            style="max-width: 100%; max-height: 150px; object-fit: contain;"
        >
    `;
    
    // Ajouter le bouton de suppression
    const previewContainer = preview.parentElement;
    
    const existingInfo = previewContainer.querySelector('.logo-info');
    if (existingInfo) existingInfo.remove();
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'logo-info';
    infoDiv.style.marginTop = '1rem';
    infoDiv.innerHTML = `
        <div style="font-size: 0.875rem; color: var(--text-gray); margin-bottom: 0.5rem;">
            📄 ${filename}<br>
            💾 ${formatBytes(size)}
        </div>
        <button 
            class="btn btn-outline" 
            style="border: 2px solid var(--danger); color: var(--danger); width: 100%; font-weight: 600;"
            onclick="deleteLogo()"
        >
            🗑️ Supprimer le logo
        </button>
    `;
    
    previewContainer.appendChild(infoDiv);
}

async function deleteLogo() {
    if (!confirm('🗑️ Supprimer le logo ?\n\nIl sera retiré de tous les PDFs.')) {
        return;
    }
    
    try {
        await ParametresAPI.deleteLogo();
        
        // Réinitialiser l'aperçu
        const preview = document.getElementById('logoPreview');
        if (preview) {
            preview.innerHTML = '<p style="color: var(--text-gray);">Aucun logo</p>';
        }
        
        // Retirer les infos et le bouton
        const infoDiv = document.querySelector('.logo-info');
        if (infoDiv) infoDiv.remove();
        
        showNotification('✅ Logo supprimé', 'success');
        
    } catch (error) {
        console.error('Erreur suppression logo:', error);
        alert('❌ Erreur lors de la suppression: ' + error.message);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// Page: Documents (GED - Gestion Électronique des Documents)
// ============================================================================

async function loadDocuments() {
    const contentArea = document.getElementById('contentArea');
    
    contentArea.innerHTML = `
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <h2 style="margin-bottom: 0.5rem;">📁 Gestion des fichiers</h2>
                <p style="color: var(--text-gray); margin: 0;">Stockage sécurisé des documents clients</p>
            </div>
            <button class="btn btn-primary" onclick="ouvrirModalUpload()" style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="bi bi-plus-circle" style="font-size: 1.25rem;"></i>
                Nouveau document
            </button>
        </div>

        <!-- Section Liste des documents -->
        <div class="card">
            <div style="padding: 1.5rem; padding-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <label class="form-label" style="margin-bottom: 0.5rem;">Sélectionner un client</label>
                        <select id="document-client-select" class="form-input" required style="min-width: 300px;">
                            <option value="">-- Choisir un client --</option>
                        </select>
                    </div>
                    <div id="documents-list-title" style="font-size: 1.125rem; font-weight: 500;">
                        <!-- Titre dynamique -->
                    </div>
                </div>
            </div>
            <div style="padding: 0 1.5rem 1.5rem 1.5rem;">
                <div id="documents-list">
                    <div style="padding: 3rem; text-align: center; color: var(--text-gray);">
                        <i class="bi bi-arrow-up-circle" style="font-size: 3rem; display: block; margin-bottom: 1rem; opacity: 0.5;"></i>
                        Sélectionnez un client pour voir ses documents
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal Upload Document -->
        <div id="modal-upload-document" class="modal-overlay" style="display: none;">
            <div class="modal" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 style="margin: 0;">📤 Importer un document</h3>
                    <button onclick="fermerModalUpload()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-gray);" title="Fermer">
                        ✕
                    </button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 1.5rem;">
                        <label class="form-label">Client <span style="color: var(--danger);">*</span></label>
                        <select id="document-client-select-modal" class="form-input" required>
                            <option value="">-- Sélectionner un client --</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label class="form-label">Type de document <span style="color: var(--danger);">*</span></label>
                        <div id="document-type-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                            <!-- Rempli dynamiquement -->
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div id="document-mois-container" style="display: none;">
                            <label class="form-label">Mois</label>
                            <select id="document-mois" class="form-input">
                                <option value="">-- Sélectionner --</option>
                                <option value="1">Janvier</option>
                                <option value="2">Février</option>
                                <option value="3">Mars</option>
                                <option value="4">Avril</option>
                                <option value="5">Mai</option>
                                <option value="6">Juin</option>
                                <option value="7">Juillet</option>
                                <option value="8">Août</option>
                                <option value="9">Septembre</option>
                                <option value="10">Octobre</option>
                                <option value="11">Novembre</option>
                                <option value="12">Décembre</option>
                            </select>
                        </div>

                        <div id="document-annee-container" style="display: none;">
                            <label class="form-label">Année</label>
                            <input type="number" id="document-annee" class="form-input" placeholder="2026" min="2000" max="2100">
                        </div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label class="form-label">Fichier <span style="color: var(--danger);">*</span></label>
                        <div id="document-drop-zone" class="drop-zone">
                            <div class="drop-zone-icon">📁</div>
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">Glissez-déposez un fichier ici</p>
                            <p style="color: var(--text-gray); font-size: 0.875rem; margin-bottom: 0.5rem;">ou cliquez pour sélectionner</p>
                            <p style="color: var(--text-gray); font-size: 0.75rem; margin: 0;">
                                Formats : PDF, DOC, DOCX, XLS, XLSX • Max : 10 MB
                            </p>
                        </div>
                        <input type="file" id="document-file-input" style="display: none;" accept=".pdf,.doc,.docx,.xls,.xlsx">
                        <div id="file-preview" style="margin-top: 1rem; display: none;"></div>
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label class="form-label">Description (optionnelle)</label>
                        <textarea id="document-description" class="form-input" rows="2" placeholder="Notes ou commentaires..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="fermerModalUpload()">
                        Annuler
                    </button>
                    <button id="btn-upload-document" class="btn btn-primary" onclick="uploaderDocument()">
                        📤 Envoyer le document
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Initialiser le module documents (défini dans documents.js)
    if (typeof chargerDocuments === 'function') {
        await chargerDocuments();
        
        // Synchroniser les dropdowns client (page principale et modal)
        const clientSelect = document.getElementById('document-client-select');
        const clientSelectModal = document.getElementById('document-client-select-modal');
        
        if (clientSelect && clientSelectModal) {
            // Copier les options
            clientSelectModal.innerHTML = clientSelect.innerHTML;
            
            // Synchroniser les sélections
            clientSelect.addEventListener('change', (e) => {
                clientSelectModal.value = e.target.value;
            });
            
            clientSelectModal.addEventListener('change', (e) => {
                clientSelect.value = e.target.value;
            });
        }
    } else {
        console.error('❌ Module documents.js non chargé');
        contentArea.innerHTML += `
            <div class="card" style="background: #fee2e2; border-color: #ef4444; margin-top: 1rem;">
                <p style="color: #991b1b; margin: 0;">
                    <strong>⚠️ Erreur :</strong> Le module de gestion documentaire (documents.js) n'est pas chargé.
                </p>
            </div>
        `;
    }
}

// ============================================================================
// Fonctions utilitaires
// ============================================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR');
}

function getStatusBadge(statut, type = 'devis') {
    const statusConfig = {
        devis: {
            'brouillon': { class: 'badge-info', text: 'Brouillon' },
            'envoye': { class: 'badge-warning', text: 'Envoyé' },
            'accepte': { class: 'badge-success', text: 'Accepté' },
            'refuse': { class: 'badge-danger', text: 'Refusé' },
            'expire': { class: 'badge-danger', text: 'Expiré' }
        },
        facture: {
            'brouillon': { class: 'badge-info', text: 'Brouillon' },
            'envoyee': { class: 'badge-warning', text: 'Envoyée' },
            'payee': { class: 'badge-success', text: 'Payée' },
            'partiel': { class: 'badge-warning', text: 'Paiement partiel' },
            'retard': { class: 'badge-danger', text: 'En retard' },
            'annulee': { class: 'badge-danger', text: 'Annulée' }
        }
    };
    
    const config = statusConfig[type][statut] || { class: 'badge-info', text: statut };
    return `<span class="badge ${config.class}">${config.text}</span>`;
}

// ============================================================================
// Gestion des raccourcis clavier
// ============================================================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeClientModal();
        closePrestationModal();
        closeDevisModal();
        closeFactureModal();
    }
});
