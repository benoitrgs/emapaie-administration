// ============================================================================
// Configuration Supabase pour EMAPAIE
// ============================================================================

// À COMPLÉTER après création du projet Supabase
const SUPABASE_CONFIG = {
    url: 'https://ziujixmwlwzkkdasahwh.supabase.co', // Ex: https://xxxxx.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdWppeG13bHd6a2tkYXNhaHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjMxMTksImV4cCI6MjA4NDIzOTExOX0.iGgb4rXm4zSr6nBXxB-i70NxCjZVKk8qxfYHE_FxSwU' // Clé publique (anon key)
};

// Initialisation du client Supabase
var supabase;

// Fonction d'initialisation (à appeler au chargement de la page)
function initSupabase() {
    if (!window.supabase) {
        console.error('Supabase client library not loaded');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        console.log('Supabase initialisé avec succès');
        return true;
    } catch (error) {
        console.error('Erreur initialisation Supabase:', error);
        return false;
    }
}

// ============================================================================
// Gestion de l'authentification
// ============================================================================

const Auth = {
    // Connexion
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Déconnexion
    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Récupérer l'utilisateur courant
    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            return null;
        }
    },
    
    // Inscription
    async signUp(email, password, metadata = {}) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });
            
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Réinitialisation mot de passe
    async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Écouter les changements d'authentification
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }
};

// ============================================================================
// API Clients
// ============================================================================

const ClientsAPI = {
    // Récupérer tous les clients
    async getAll(includeArchived = false) {
        let query = supabase
            .from('clients')
            .select('*')
            .order('raison_sociale', { ascending: true });
        
        if (!includeArchived) {
            query = query.eq('archived', false);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },
    
    // Récupérer un client par ID
    async getById(id) {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Créer un client
    async create(client) {
        const { data, error } = await supabase
            .from('clients')
            .insert([client])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Mettre à jour un client
    async update(id, updates) {
        const { data, error } = await supabase
            .from('clients')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Archiver un client
    async archive(id) {
        return this.update(id, { archived: true });
    },
    
    // Rechercher des clients
    async search(searchTerm) {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .or(`raison_sociale.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,ville.ilike.%${searchTerm}%`)
            .eq('archived', false)
            .order('raison_sociale');
        
        if (error) throw error;
        return data;
    }
};

// ============================================================================
// API Prestations
// ============================================================================

const PrestationsAPI = {
    // Récupérer toutes les prestations
    async getAll(activeOnly = true) {
        let query = supabase
            .from('prestations')
            .select('*')
            .order('categorie', { ascending: true })
            .order('nom', { ascending: true });
        
        if (activeOnly) {
            query = query.eq('active', true);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },
    
    // Récupérer par catégorie
    async getByCategorie(categorie) {
        const { data, error } = await supabase
            .from('prestations')
            .select('*')
            .eq('categorie', categorie)
            .eq('active', true)
            .order('nom');
        
        if (error) throw error;
        return data;
    },
    
    // Créer une prestation
    async create(prestation) {
        const { data, error } = await supabase
            .from('prestations')
            .insert([prestation])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Mettre à jour une prestation
    async update(id, updates) {
        const { data, error } = await supabase
            .from('prestations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }
};

// ============================================================================
// API Devis
// ============================================================================

const DevisAPI = {
    // Récupérer tous les devis
    async getAll() {
        const { data, error } = await supabase
            .from('v_devis_complet')
            .select('*')
            .order('date_emission', { ascending: false });
        
        if (error) throw error;
        return data;
    },
    
    // Récupérer un devis avec ses lignes
    async getById(id) {
        const { data: devis, error: devisError } = await supabase
            .from('devis')
            .select(`
                *,
                client:clients(*),
                lignes:lignes_devis(*)
            `)
            .eq('id', id)
            .single();
        
        if (devisError) throw devisError;
        
        // Trier les lignes par ordre
        if (devis.lignes) {
            devis.lignes.sort((a, b) => a.ordre - b.ordre);
        }
        
        return devis;
    },
    
    // Créer un devis
    async create(devis) {
        const { data, error } = await supabase
            .from('devis')
            .insert([devis])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Mettre à jour un devis
    async update(id, updates) {
        const { data, error } = await supabase
            .from('devis')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Ajouter une ligne au devis
    async addLigne(devisId, ligne) {
        const { data, error } = await supabase
            .from('lignes_devis')
            .insert([{ ...ligne, devis_id: devisId }])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Mettre à jour une ligne
    async updateLigne(ligneId, updates) {
        const { data, error } = await supabase
            .from('lignes_devis')
            .update(updates)
            .eq('id', ligneId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Supprimer une ligne
    async deleteLigne(ligneId) {
        const { error } = await supabase
            .from('lignes_devis')
            .delete()
            .eq('id', ligneId);
        
        if (error) throw error;
    },
    
    // Récupérer les devis d'un client
    async getByClient(clientId) {
        const { data, error } = await supabase
            .from('devis')
            .select('*')
            .eq('client_id', clientId)
            .order('date_emission', { ascending: false });
        
        if (error) throw error;
        return data;
    }
};

// ============================================================================
// API Factures
// ============================================================================

const FacturesAPI = {
    // Récupérer toutes les factures
    async getAll() {
        const { data, error } = await supabase
            .from('v_factures_complet')
            .select('*')
            .order('date_emission', { ascending: false });
        
        if (error) throw error;
        return data;
    },
    
    // Récupérer une facture avec ses lignes
    async getById(id) {
        const { data: facture, error: factureError } = await supabase
            .from('factures')
            .select(`
                *,
                client:clients(*),
                lignes:lignes_factures(*)
            `)
            .eq('id', id)
            .single();
        
        if (factureError) throw factureError;
        
        // Trier les lignes par ordre
        if (facture.lignes) {
            facture.lignes.sort((a, b) => a.ordre - b.ordre);
        }
        
        return facture;
    },
    
    // Créer une facture
    async create(facture) {
        const { data, error } = await supabase
            .from('factures')
            .insert([facture])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Créer une facture depuis un devis
    async createFromDevis(devisId) {
        // Récupérer le devis
        const devis = await DevisAPI.getById(devisId);
        
        // Créer la facture
        const facture = await this.create({
            devis_id: devisId,
            client_id: devis.client_id,
            taux_tva: devis.taux_tva,
            notes: devis.notes
        });
        
        // Copier les lignes
        for (const ligne of devis.lignes) {
            await this.addLigne(facture.id, {
                prestation_id: ligne.prestation_id,
                description: ligne.description,
                quantite: ligne.quantite,
                prix_unitaire: ligne.prix_unitaire,
                remise_pourcent: ligne.remise_pourcent,
                ordre: ligne.ordre
            });
        }
        
        return await this.getById(facture.id);
    },
    
    // Mettre à jour une facture
    async update(id, updates) {
        const { data, error } = await supabase
            .from('factures')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Ajouter une ligne à la facture
    async addLigne(factureId, ligne) {
        const { data, error } = await supabase
            .from('lignes_factures')
            .insert([{ ...ligne, facture_id: factureId }])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    // Récupérer les factures d'un client
    async getByClient(clientId) {
        const { data, error } = await supabase
            .from('factures')
            .select('*')
            .eq('client_id', clientId)
            .order('date_emission', { ascending: false });
        
        if (error) throw error;
        return data;
    }
};

// ============================================================================
// API Paramètres - Configuration entreprise et logo
// ============================================================================

const ParametresAPI = {
    // Récupérer les paramètres (il n'y a qu'une seule ligne)
    async get() {
        const { data, error } = await supabase
            .from('parametres')
            .select('*')
            .limit(1)
            .single();
        
        if (error) {
            // Si aucune ligne n'existe, retourner des valeurs par défaut
            if (error.code === 'PGRST116') {
                return {
                    nom_entreprise: 'EMAPAIE',
                    adresse: '',
                    code_postal: '',
                    ville: '',
                    telephone: '',
                    email: '',
                    siret: '',
                    numero_tva: '',
                    logo_base64: null,
                    logo_filename: null,
                    logo_size: null,
                    taux_tva_defaut: 20.00,
                    delai_paiement_defaut: 30,
                    conditions_generales: '',
                    conditions_reglement: ''
                };
            }
            throw error;
        }
        
        return data;
    },
    
    // Mettre à jour les paramètres
    async update(parametres) {
        // Essayer de mettre à jour la ligne existante
        let { data, error } = await supabase
            .from('parametres')
            .select('id')
            .limit(1)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Aucune ligne n'existe, on la crée
            const { data: newData, error: insertError } = await supabase
                .from('parametres')
                .insert([parametres])
                .select()
                .single();
            
            if (insertError) throw insertError;
            return newData;
        }
        
        if (error) throw error;
        
        // Mettre à jour la ligne existante
        const { data: updatedData, error: updateError } = await supabase
            .from('parametres')
            .update(parametres)
            .eq('id', data.id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        return updatedData;
    },
    
    // Mettre à jour uniquement le logo
    async updateLogo(logoBase64, filename, size) {
        const { data, error } = await supabase
            .from('parametres')
            .select('id')
            .limit(1)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Créer une ligne avec le logo
            const { data: newData, error: insertError } = await supabase
                .from('parametres')
                .insert([{
                    logo_base64: logoBase64,
                    logo_filename: filename,
                    logo_size: size
                }])
                .select()
                .single();
            
            if (insertError) throw insertError;
            return newData;
        }
        
        if (error) throw error;
        
        // Mettre à jour le logo
        const { data: updatedData, error: updateError } = await supabase
            .from('parametres')
            .update({
                logo_base64: logoBase64,
                logo_filename: filename,
                logo_size: size
            })
            .eq('id', data.id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        return updatedData;
    },
    
    // Supprimer le logo
    async deleteLogo() {
        const { data, error } = await supabase
            .from('parametres')
            .select('id')
            .limit(1)
            .single();
        
        if (error) throw error;
        
        const { data: updatedData, error: updateError } = await supabase
            .from('parametres')
            .update({
                logo_base64: null,
                logo_filename: null,
                logo_size: null
            })
            .eq('id', data.id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        return updatedData;
    }
};

// ============================================================================
// Export pour utilisation
// ============================================================================

// Pour utilisation dans les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSupabase,
        Auth,
        ClientsAPI,
        PrestationsAPI,
        DevisAPI,
        FacturesAPI,
        ParametresAPI
    };
}
