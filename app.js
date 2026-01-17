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

function showClientModal(clientId = null) {
    // TODO: Implémenter le modal de création/édition client
    alert('Fonctionnalité en cours de développement');
}

function editClient(clientId) {
    showClientModal(clientId);
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

function showPrestationModal(prestationId = null) {
    // TODO: Implémenter le modal de création/édition prestation
    alert('Fonctionnalité en cours de développement');
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

function showDevisModal(devisId = null) {
    // TODO: Implémenter le modal de création/édition devis
    alert('Fonctionnalité en cours de développement');
}

function viewDevis(devisId) {
    // TODO: Implémenter la vue détaillée du devis
    alert('Fonctionnalité en cours de développement');
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

function showFactureModal(factureId = null) {
    // TODO: Implémenter le modal de création/édition facture
    alert('Fonctionnalité en cours de développement');
}

function viewFacture(factureId) {
    // TODO: Implémenter la vue détaillée de la facture
    alert('Fonctionnalité en cours de développement');
}

// ============================================================================
// Page: Paramètres
// ============================================================================

async function loadParametres() {
    const contentArea = document.getElementById('contentArea');
    const parametres = await ParametresAPI.getAll();
    
    contentArea.innerHTML = `
        <div class="page-header">
            <h2>Paramètres</h2>
            <p>Configuration de l'application</p>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 1.5rem;">Informations entreprise</h3>
            <form id="parametresForm">
                ${parametres.filter(p => p.cle.startsWith('entreprise_')).map(p => `
                    <div class="form-group">
                        <label class="form-label">${p.description || p.cle}</label>
                        <input 
                            type="text" 
                            class="form-input" 
                            name="${p.cle}"
                            value="${p.valeur || ''}"
                        >
                    </div>
                `).join('')}
                
                <h3 style="margin: 2rem 0 1.5rem;">Paramètres par défaut</h3>
                
                ${parametres.filter(p => !p.cle.startsWith('entreprise_')).map(p => `
                    <div class="form-group">
                        <label class="form-label">${p.description || p.cle}</label>
                        <input 
                            type="${p.type === 'number' ? 'number' : 'text'}" 
                            class="form-input" 
                            name="${p.cle}"
                            value="${p.valeur || ''}"
                        >
                    </div>
                `).join('')}
                
                <button type="submit" class="btn btn-primary">
                    💾 Enregistrer les modifications
                </button>
            </form>
        </div>
    `;
    
    document.getElementById('parametresForm').addEventListener('submit', saveParametres);
}

async function saveParametres(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        for (const [cle, valeur] of formData.entries()) {
            await ParametresAPI.set(cle, valeur);
        }
        
        alert('Paramètres enregistrés avec succès !');
    } catch (error) {
        alert('Erreur lors de l\'enregistrement: ' + error.message);
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
