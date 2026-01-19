/**
 * MODULE GESTION DOCUMENTAIRE (GED)
 * Système sécurisé de stockage et gestion des documents clients
 * Upload, téléchargement, organisation automatique
 */

// Configuration
const DOCUMENTS_CONFIG = {
    bucketName: 'documents',
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
};

// Types de documents disponibles
const TYPES_DOCUMENTS = {
    'bulletin_paie': { label: 'Bulletin de paie', needsMonth: true, needsYear: true },
    'contrat_travail': { label: 'Contrat de travail', needsMonth: false, needsYear: true },
    'dpae': { label: 'DPAE', needsMonth: false, needsYear: true },
    'solde_tout_compte': { label: 'Solde de tout compte', needsMonth: false, needsYear: true },
    'attestation_employeur': { label: 'Attestation employeur', needsMonth: false, needsYear: true },
    'certificat_travail': { label: 'Certificat de travail', needsMonth: false, needsYear: true },
    'arret_travail': { label: 'Arrêt de travail', needsMonth: false, needsYear: true },
    'note_frais': { label: 'Note de frais', needsMonth: true, needsYear: true },
    'justificatif': { label: 'Justificatif', needsMonth: false, needsYear: false },
    'autre': { label: 'Autre', needsMonth: false, needsYear: false }
};

// Mois
const MOIS = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
];

// Variables globales
let currentClientDocuments = null;
let selectedFile = null;

/**
 * Charger la page Documents
 */
async function chargerDocuments() {
    console.log('📁 Chargement des documents...');
    
    // Charger les clients pour le dropdown
    await chargerClientsDropdown();
    
    // Charger les types de documents
    chargerTypesDocuments();
    
    // Initialiser le drag & drop
    initDragAndDrop();
    
    console.log('✅ Page documents chargée');
}

/**
 * Ouvrir le modal d'upload
 */
function ouvrirModalUpload() {
    const modal = document.getElementById('modal-upload-document');
    if (modal) {
        modal.style.display = 'flex';
        // Focus sur le select client
        setTimeout(() => {
            document.getElementById('document-client-select')?.focus();
        }, 100);
    }
}

/**
 * Fermer le modal d'upload
 */
function fermerModalUpload() {
    const modal = document.getElementById('modal-upload-document');
    if (modal) {
        modal.style.display = 'none';
        // Réinitialiser le formulaire
        resetUploadForm();
    }
}

/**
 * Fermer le modal si clic en dehors
 */
window.addEventListener('click', (e) => {
    const modal = document.getElementById('modal-upload-document');
    if (e.target === modal) {
        fermerModalUpload();
    }
});

/**
 * Charger la liste des clients dans les dropdowns
 */
async function chargerClientsDropdown() {
    try {
        console.log('📋 Chargement des clients...');
        
        // Utiliser l'API ClientsAPI si disponible, sinon accès direct Supabase
        let clients;
        
        if (typeof ClientsAPI !== 'undefined' && ClientsAPI.getAll) {
            console.log('🔧 Utilisation de ClientsAPI.getAll()');
            clients = await ClientsAPI.getAll();
        } else {
            console.log('🔧 Utilisation directe de Supabase');
            const { data, error } = await supabase
                .from('clients')
                .select('id, raison_sociale')
                .order('raison_sociale');
            
            if (error) {
                console.error('❌ Erreur Supabase:', error);
                throw error;
            }
            clients = data;
        }

        console.log(`✅ ${clients?.length || 0} clients trouvés`, clients);

        // Remplir le select principal (dans la page)
        const selectMain = document.getElementById('document-client-select');
        // Remplir le select du modal
        const selectModal = document.getElementById('document-client-select-modal');
        
        if (!selectMain) {
            console.error('❌ Element document-client-select non trouvé');
            return;
        }
        
        const optionsHTML = '<option value="">-- Sélectionner un client --</option>' +
            (clients || []).map(client => 
                `<option value="${client.id}">${client.raison_sociale || client.nom || 'Client sans nom'}</option>`
            ).join('');
        
        if (selectMain) {
            selectMain.innerHTML = optionsHTML;
        }
        
        if (selectModal) {
            selectModal.innerHTML = optionsHTML;
        }
        
        if (!clients || clients.length === 0) {
            console.warn('⚠️ Aucun client dans la base de données');
            return;
        }
        
        console.log('✅ Dropdowns clients remplis avec', clients.length, 'clients');

        // Event listener pour le select principal
        if (selectMain) {
            selectMain.addEventListener('change', (e) => {
                if (e.target.value) {
                    console.log('📂 Client sélectionné:', e.target.value);
                    chargerDocumentsClient(e.target.value);
                } else {
                    // Afficher message par défaut
                    const container = document.getElementById('documents-list');
                    if (container) {
                        container.innerHTML = `
                            <div style="padding: 3rem; text-align: center; color: var(--text-gray);">
                                <p style="font-size: 1.1rem;">👆 Sélectionnez un client pour voir ses documents</p>
                            </div>
                        `;
                    }
                }
            });
        }

    } catch (error) {
        console.error('❌ Erreur chargement clients:', error);
        alert('Erreur lors du chargement des clients. Vérifiez la console (F12).');
    }
}

/**
 * Ouvrir le modal d'upload
 */
function ouvrirModalUpload() {
    const modal = document.getElementById('modal-upload-document');
    if (modal) {
        modal.style.display = 'flex';
        // Synchroniser le client sélectionné
        const selectMain = document.getElementById('document-client-select');
        const selectModal = document.getElementById('document-client-select-modal');
        if (selectMain && selectModal && selectMain.value) {
            selectModal.value = selectMain.value;
        }
        // Focus sur le select client
        setTimeout(() => {
            selectModal?.focus();
        }, 100);
    }
}

/**
 * Fermer le modal d'upload
 */
function fermerModalUpload(event) {
    // Si event est fourni, vérifier que c'est un clic sur l'overlay ou le bouton fermer
    if (event && event.target.className !== 'modal-overlay' && event.target.tagName !== 'BUTTON') {
        return;
    }
    
    const modal = document.getElementById('modal-upload-document');
    if (modal) {
        modal.style.display = 'none';
        // Réinitialiser le formulaire
        resetUploadForm();
    }
}

/**
 * Rafraîchir la liste des documents
 */
function rafraichirListeDocuments() {
    const selectMain = document.getElementById('document-client-select');
    if (selectMain && selectMain.value) {
        chargerDocumentsClient(selectMain.value);
    }
}

/**
 * Charger les types de documents
 */
function chargerTypesDocuments() {
    const container = document.getElementById('document-type-container');
    container.innerHTML = '';
    
    Object.entries(TYPES_DOCUMENTS).forEach(([code, info]) => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
            <input 
                class="form-check-input" 
                type="radio" 
                name="document-type" 
                id="type-${code}" 
                value="${code}"
                onchange="handleTypeChange('${code}')"
            >
            <label class="form-check-label" for="type-${code}">
                ${info.label}
            </label>
        `;
        container.appendChild(div);
    });
}

/**
 * Gérer le changement de type de document
 */
function handleTypeChange(typeCode) {
    const typeInfo = TYPES_DOCUMENTS[typeCode];
    
    // Afficher/masquer le sélecteur de mois
    const moisContainer = document.getElementById('document-mois-container');
    if (typeInfo.needsMonth) {
        moisContainer.style.display = 'block';
        document.getElementById('document-mois').required = true;
    } else {
        moisContainer.style.display = 'none';
        document.getElementById('document-mois').required = false;
        document.getElementById('document-mois').value = '';
    }
    
    // Afficher/masquer le sélecteur d'année
    const anneeContainer = document.getElementById('document-annee-container');
    if (typeInfo.needsYear) {
        anneeContainer.style.display = 'block';
        document.getElementById('document-annee').required = true;
    } else {
        anneeContainer.style.display = 'none';
        document.getElementById('document-annee').required = false;
        document.getElementById('document-annee').value = '';
    }
}

/**
 * Initialiser le drag & drop
 */
function initDragAndDrop() {
    const dropZone = document.getElementById('document-drop-zone');
    const fileInput = document.getElementById('document-file-input');
    
    // Click sur la zone = ouvrir le sélecteur
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Drag & Drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('border-primary', 'bg-light');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('border-primary', 'bg-light');
        }, false);
    });
    
    // Gérer le drop
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    }, false);
    
    // Gérer la sélection via input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

/**
 * Gérer la sélection d'un fichier
 */
function handleFileSelect(file) {
    console.log('📄 Fichier sélectionné:', file.name);
    
    // Validation
    const validation = validateFile(file);
    if (!validation.valid) {
        alert('❌ ' + validation.error);
        selectedFile = null;
        updateFilePreview(null);
        return;
    }
    
    selectedFile = file;
    updateFilePreview(file);
}

/**
 * Valider un fichier
 */
function validateFile(file) {
    // Vérifier la taille
    if (file.size > DOCUMENTS_CONFIG.maxFileSize) {
        return {
            valid: false,
            error: `Le fichier est trop volumineux (${formatFileSize(file.size)}). Taille maximale : 10 MB`
        };
    }
    
    // Vérifier le type MIME
    if (!DOCUMENTS_CONFIG.allowedMimeTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Type de fichier non autorisé. Formats acceptés : PDF, DOC, DOCX, XLS, XLSX'
        };
    }
    
    // Vérifier l'extension
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!DOCUMENTS_CONFIG.allowedExtensions.includes(extension)) {
        return {
            valid: false,
            error: 'Extension de fichier non autorisée. Extensions acceptées : .pdf, .doc, .docx, .xls, .xlsx'
        };
    }
    
    return { valid: true };
}

/**
 * Mettre à jour l'aperçu du fichier sélectionné
 */
function updateFilePreview(file) {
    const preview = document.getElementById('file-preview');
    
    if (file) {
        preview.innerHTML = `
            <div class="alert alert-success d-flex align-items-center">
                <i class="bi bi-file-earmark-check me-2" style="font-size: 1.5rem;"></i>
                <div class="flex-grow-1">
                    <strong>${file.name}</strong><br>
                    <small>${formatFileSize(file.size)} • ${file.type || 'Type inconnu'}</small>
                </div>
                <button type="button" class="btn-close" onclick="clearFileSelection()"></button>
            </div>
        `;
        preview.style.display = 'block';
    } else {
        preview.innerHTML = '';
        preview.style.display = 'none';
    }
}

/**
 * Effacer la sélection de fichier
 */
function clearFileSelection() {
    selectedFile = null;
    document.getElementById('document-file-input').value = '';
    updateFilePreview(null);
}

/**
 * Uploader un document
 */
async function uploaderDocument() {
    try {
        // Validation du formulaire - Utiliser le select du modal
        const clientId = document.getElementById('document-client-select-modal').value;
        if (!clientId) {
            alert('❌ Veuillez sélectionner un client');
            return;
        }
        
        const typeElement = document.querySelector('input[name="document-type"]:checked');
        if (!typeElement) {
            alert('❌ Veuillez sélectionner un type de document');
            return;
        }
        const typeDocument = typeElement.value;
        
        if (!selectedFile) {
            alert('❌ Veuillez sélectionner un fichier');
            return;
        }
        
        const typeInfo = TYPES_DOCUMENTS[typeDocument];
        let mois = null;
        let annee = null;
        
        if (typeInfo.needsMonth) {
            mois = parseInt(document.getElementById('document-mois').value);
            if (!mois) {
                alert('❌ Veuillez sélectionner un mois');
                return;
            }
        }
        
        if (typeInfo.needsYear) {
            annee = parseInt(document.getElementById('document-annee').value);
            if (!annee) {
                alert('❌ Veuillez saisir une année');
                return;
            }
        }
        
        const description = document.getElementById('document-description').value;
        
        // Afficher le loader
        showUploadProgress(true);
        
        // Construire le chemin de stockage
        const extension = '.' + selectedFile.name.split('.').pop().toLowerCase();
        const timestamp = Date.now();
        let nomFichier = `${typeDocument}_${timestamp}${extension}`;
        
        // Ajouter mois/année au nom si disponible
        if (mois && annee) {
            const moisStr = mois.toString().padStart(2, '0');
            nomFichier = `${moisStr}_${typeDocument}_${annee}${extension}`;
        } else if (annee) {
            nomFichier = `${typeDocument}_${annee}_${timestamp}${extension}`;
        }
        
        // Construire le chemin : client_id/type/annee/fichier
        let cheminStorage = `${clientId}/${typeDocument}`;
        if (annee) {
            cheminStorage += `/${annee}`;
        }
        cheminStorage += `/${nomFichier}`;
        
        console.log('📤 Upload vers:', cheminStorage);
        
        // Upload vers Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(DOCUMENTS_CONFIG.bucketName)
            .upload(cheminStorage, selectedFile, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (uploadError) throw uploadError;
        
        console.log('✅ Fichier uploadé:', uploadData);
        
        // Enregistrer les métadonnées en base
        const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert({
                client_id: clientId,
                nom_fichier: selectedFile.name,
                nom_original: selectedFile.name,
                chemin_storage: cheminStorage,
                taille_octets: selectedFile.size,
                type_mime: selectedFile.type,
                extension: extension,
                type_document: typeDocument,
                annee: annee,
                mois: mois,
                description: description,
                uploaded_by: 'utilisateur@emapaie.fr' // À adapter avec l'authentification
            })
            .select()
            .single();
        
        if (docError) {
            // Si erreur en base, supprimer le fichier du storage
            await supabase.storage
                .from(DOCUMENTS_CONFIG.bucketName)
                .remove([cheminStorage]);
            throw docError;
        }
        
        console.log('✅ Document enregistré en base:', docData);
        
        // Masquer le loader
        showUploadProgress(false);
        
        // Afficher succès
        alert(`✅ Document "${selectedFile.name}" uploadé avec succès !`);
        
        // Fermer le modal
        fermerModalUpload();
        
        // Recharger la liste des documents du client
        await chargerDocumentsClient(clientId);
        
    } catch (error) {
        showUploadProgress(false);
        console.error('❌ Erreur upload document:', error);
        alert('❌ Erreur lors de l\'upload : ' + error.message);
    }
}

/**
 * Afficher/masquer le loader d'upload
 */
function showUploadProgress(show) {
    const btn = document.getElementById('btn-upload-document');
    if (show) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Upload en cours...';
    } else {
        btn.disabled = false;
        btn.innerHTML = '📤 Envoyer le document';
    }
}

/**
 * Réinitialiser le formulaire d'upload
 */
function resetUploadForm() {
    document.getElementById('document-type-container').querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    document.getElementById('document-mois').value = '';
    document.getElementById('document-annee').value = '';
    document.getElementById('document-description').value = '';
    document.getElementById('document-mois-container').style.display = 'none';
    document.getElementById('document-annee-container').style.display = 'none';
    clearFileSelection();
}

/**
 * Charger les documents d'un client
 */
async function chargerDocumentsClient(clientId) {
    try {
        console.log('📂 Chargement documents client:', clientId);
        
        const { data: documents, error } = await supabase
            .from('v_documents_complet')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentClientDocuments = documents;
        afficherDocumentsClient(documents);
        
    } catch (error) {
        console.error('❌ Erreur chargement documents:', error);
        alert('Erreur lors du chargement des documents');
    }
}

/**
 * Afficher la liste des documents d'un client
 */
function afficherDocumentsClient(documents) {
    const container = document.getElementById('documents-list');
    const selectMain = document.getElementById('document-client-select');
    const clientNom = selectMain?.options[selectMain.selectedIndex]?.text || 'Client';
    
    if (!documents || documents.length === 0) {
        container.innerHTML = `
            <div style="padding: 3rem; text-align: center; background: #f8f9fa; border-radius: 8px;">
                <i class="bi bi-inbox" style="font-size: 3rem; color: #6c757d;"></i>
                <p style="margin-top: 1rem; color: var(--text-gray);">Aucun document pour ce client</p>
            </div>
        `;
        return;
    }
    
    // Grouper par année
    const parAnnee = {};
    documents.forEach(doc => {
        const annee = doc.annee || 'Sans année';
        if (!parAnnee[annee]) {
            parAnnee[annee] = [];
        }
        parAnnee[annee].push(doc);
    });
    
    let html = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; padding: 1rem; background: #f0f9ff; border-radius: 8px;">
            <div>
                <h5 style="margin: 0; color: var(--primary);">📄 ${clientNom}</h5>
                <p style="margin: 0; font-size: 0.875rem; color: var(--text-gray);">${documents.length} document${documents.length > 1 ? 's' : ''}</p>
            </div>
        </div>
    `;
    
    // Afficher par année (ordre décroissant)
    Object.keys(parAnnee).sort((a, b) => b - a).forEach(annee => {
        html += `
            <div style="margin-bottom: 1.5rem;">
                <h6 style="color: var(--primary); margin-bottom: 0.75rem; font-weight: 600; font-size: 0.9rem;">
                    📅 ${annee}
                </h6>
        `;
        
        parAnnee[annee].forEach(doc => {
            const iconType = getIconForFileType(doc.extension);
            const dateStr = new Date(doc.created_at).toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: '2-digit' 
            });
            
            html += `
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.75rem 1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 1rem; transition: all 0.2s;" 
                     onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)'; this.style.borderColor='var(--primary)'" 
                     onmouseout="this.style.boxShadow='none'; this.style.borderColor='#e5e7eb'">
                    
                    <i class="${iconType}" style="font-size: 1.75rem; flex-shrink: 0;"></i>
                    
                    <div style="flex-grow: 1; min-width: 0;">
                        <div style="font-weight: 500; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem;">
                            ${doc.nom_fichier}
                        </div>
                        <div style="font-size: 0.8125rem; color: #6b7280; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span class="badge" style="background: #6b7280; font-size: 0.7rem; padding: 0.15rem 0.5rem;">${doc.type_document_libelle}</span>
                            ${doc.mois_libelle ? `<span class="badge" style="background: #0ea5e9; font-size: 0.7rem; padding: 0.15rem 0.5rem;">${doc.mois_libelle}</span>` : ''}
                            <span>${doc.taille_ko} Ko</span>
                            <span>•</span>
                            <span>${dateStr}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                        <button class="btn btn-sm btn-primary" onclick="voirDocument('${doc.id}', '${doc.chemin_storage}', '${doc.nom_fichier}')" title="Voir" style="padding: 0.4rem 0.75rem;">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="telechargerDocument('${doc.id}', '${doc.chemin_storage}', '${doc.nom_fichier}')" title="Télécharger" style="padding: 0.4rem 0.75rem;">
                            ⬇️
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="confirmerSuppressionDocument('${doc.id}', '${doc.nom_fichier}')" title="Supprimer" style="padding: 0.4rem 0.75rem;">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

/**
 * Obtenir l'icône selon le type de fichier
 */
function getIconForFileType(extension) {
    switch (extension) {
        case '.pdf':
            return 'bi bi-file-earmark-pdf-fill text-danger';
        case '.doc':
        case '.docx':
            return 'bi bi-file-earmark-word-fill text-primary';
        case '.xls':
        case '.xlsx':
            return 'bi bi-file-earmark-excel-fill text-success';
        default:
            return 'bi bi-file-earmark-fill text-secondary';
    }
}

/**
 * Télécharger un document
 */
async function telechargerDocument(documentId, cheminStorage, nomFichier) {
    try {
        console.log('⬇️ Téléchargement:', cheminStorage);
        
        // Créer une URL signée temporaire (valide 1 heure)
        const { data, error } = await supabase.storage
            .from(DOCUMENTS_CONFIG.bucketName)
            .createSignedUrl(cheminStorage, 3600);
        
        if (error) throw error;
        
        // Télécharger le fichier
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = nomFichier;
        link.click();
        
        console.log('✅ Téléchargement lancé');
        
    } catch (error) {
        console.error('❌ Erreur téléchargement:', error);
        alert('Erreur lors du téléchargement du document');
    }
}

/**
 * Visualiser un document dans le navigateur
 */
async function voirDocument(documentId, cheminStorage, nomFichier) {
    try {
        console.log('👁️ Ouverture:', cheminStorage);
        
        // Créer une URL signée temporaire (valide 1 heure)
        const { data, error } = await supabase.storage
            .from(DOCUMENTS_CONFIG.bucketName)
            .createSignedUrl(cheminStorage, 3600);
        
        if (error) throw error;
        
        // Ouvrir dans un nouvel onglet
        window.open(data.signedUrl, '_blank');
        
        console.log('✅ Document ouvert dans un nouvel onglet');
        
    } catch (error) {
        console.error('❌ Erreur ouverture:', error);
        alert('Erreur lors de l\'ouverture du document');
    }
}

/**
 * Confirmer la suppression d'un document
 */
function confirmerSuppressionDocument(documentId, nomFichier) {
    if (confirm(`⚠️ Êtes-vous sûr de vouloir supprimer le document "${nomFichier}" ?\n\nCette action est irréversible.`)) {
        supprimerDocument(documentId);
    }
}

/**
 * Supprimer un document
 */
async function supprimerDocument(documentId) {
    try {
        console.log('🗑️ Suppression document:', documentId);
        
        // Récupérer le chemin du fichier
        const { data: doc, error: getError } = await supabase
            .from('documents')
            .select('chemin_storage, client_id')
            .eq('id', documentId)
            .single();
        
        if (getError) throw getError;
        
        // Supprimer du storage
        const { error: storageError } = await supabase.storage
            .from(DOCUMENTS_CONFIG.bucketName)
            .remove([doc.chemin_storage]);
        
        if (storageError) console.warn('⚠️ Erreur suppression storage:', storageError);
        
        // Supprimer de la base
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId);
        
        if (dbError) throw dbError;
        
        console.log('✅ Document supprimé');
        alert('✅ Document supprimé avec succès');
        
        // Recharger la liste
        await chargerDocumentsClient(doc.client_id);
        
    } catch (error) {
        console.error('❌ Erreur suppression:', error);
        alert('Erreur lors de la suppression du document');
    }
}

/**
 * Formater la taille d'un fichier
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

console.log('✅ Module documents.js chargé avec succès');
