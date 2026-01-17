// ============================================================================
// Module de génération PDF - EMAPAIE
// Utilise pdfmake pour créer des PDFs professionnels
// ============================================================================

// Configuration de l'entreprise (à personnaliser)
const ENTREPRISE_CONFIG = {
    nom: 'EMAPAIE',
    adresse: 'Adresse de votre entreprise',
    code_postal: '75001',
    ville: 'Paris',
    telephone: '01 23 45 67 89',
    email: 'contact@emapaie.fr',
    siret: '123 456 789 00012',
    tva: 'FR12345678901'
};

// ============================================================================
// Générer PDF pour un DEVIS
// ============================================================================

async function genererPDFDevis(devisId) {
    try {
        // Charger les données du devis
        const devis = await DevisAPI.getById(devisId);
        const client = await ClientsAPI.getById(devis.client_id);
        
        // Charger le logo depuis les paramètres
        const parametres = await ParametresAPI.get();
        const logoImage = parametres.logo_base64;
        
        // Préparer le contenu du PDF
        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            
            // En-tête de page
            header: function(currentPage, pageCount) {
                return {
                    columns: [
                        {
                            text: ENTREPRISE_CONFIG.nom,
                            style: 'headerCompany',
                            margin: [40, 20, 0, 0]
                        },
                        {
                            text: `Page ${currentPage} / ${pageCount}`,
                            alignment: 'right',
                            style: 'headerPage',
                            margin: [0, 20, 40, 0]
                        }
                    ]
                };
            },
            
            // Pied de page
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        {
                            text: `${ENTREPRISE_CONFIG.nom} - SIRET: ${ENTREPRISE_CONFIG.siret} - TVA: ${ENTREPRISE_CONFIG.tva}`,
                            style: 'footer',
                            alignment: 'center',
                            margin: [40, 20, 40, 0]
                        }
                    ]
                };
            },
            
            // Contenu du document
            content: [
                // Logo (si présent)
                ...( logoImage ? [{
                    image: logoImage,
                    width: 120,
                    alignment: 'center',
                    margin: [0, 0, 0, 20]
                }] : []),
                
                // Titre
                {
                    text: 'DEVIS',
                    style: 'title',
                    margin: [0, 0, 0, 10]
                },
                
                // Informations devis et entreprise
                {
                    columns: [
                        // Colonne gauche : Entreprise
                        {
                            width: '50%',
                            stack: [
                                { text: ENTREPRISE_CONFIG.nom, style: 'companyName' },
                                { text: ENTREPRISE_CONFIG.adresse, style: 'companyInfo' },
                                { text: `${ENTREPRISE_CONFIG.code_postal} ${ENTREPRISE_CONFIG.ville}`, style: 'companyInfo' },
                                { text: `Tél: ${ENTREPRISE_CONFIG.telephone}`, style: 'companyInfo' },
                                { text: `Email: ${ENTREPRISE_CONFIG.email}`, style: 'companyInfo' }
                            ]
                        },
                        // Colonne droite : Numéro et dates
                        {
                            width: '50%',
                            stack: [
                                { text: `N° ${devis.numero}`, style: 'devisNumber' },
                                { text: `Date d'émission: ${formatDateFR(devis.date_emission)}`, style: 'dateInfo' },
                                { text: `Valable jusqu'au: ${formatDateFR(devis.date_validite)}`, style: 'dateInfo' },
                                { 
                                    text: getStatutText(devis.statut), 
                                    style: 'statut',
                                    color: getStatutColor(devis.statut),
                                    margin: [0, 5, 0, 0]
                                }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },
                
                // Client
                {
                    text: 'CLIENT',
                    style: 'sectionTitle',
                    margin: [0, 20, 0, 5]
                },
                {
                    stack: [
                        { text: client.raison_sociale, style: 'clientName' },
                        { text: client.adresse || '', style: 'clientInfo' },
                        { text: client.code_postal && client.ville ? `${client.code_postal} ${client.ville}` : '', style: 'clientInfo' },
                        { text: client.email || '', style: 'clientInfo' },
                        { text: client.telephone || '', style: 'clientInfo' }
                    ],
                    margin: [0, 0, 0, 20]
                },
                
                // Tableau des prestations
                {
                    text: 'PRESTATIONS',
                    style: 'sectionTitle',
                    margin: [0, 10, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 60, 70, 50, 70],
                        body: [
                            // En-tête du tableau
                            [
                                { text: 'Description', style: 'tableHeader' },
                                { text: 'Quantité', style: 'tableHeader', alignment: 'center' },
                                { text: 'Prix unitaire', style: 'tableHeader', alignment: 'right' },
                                { text: 'Remise', style: 'tableHeader', alignment: 'center' },
                                { text: 'Montant HT', style: 'tableHeader', alignment: 'right' }
                            ],
                            // Lignes de prestations
                            ...devis.lignes.map(ligne => [
                                { text: ligne.description, style: 'tableCell' },
                                { text: ligne.quantite.toFixed(2), style: 'tableCell', alignment: 'center' },
                                { text: formatCurrencyPDF(ligne.prix_unitaire), style: 'tableCell', alignment: 'right' },
                                { text: ligne.remise_pourcent > 0 ? `${ligne.remise_pourcent}%` : '-', style: 'tableCell', alignment: 'center' },
                                { text: formatCurrencyPDF(ligne.montant_ht), style: 'tableCell', alignment: 'right', bold: true }
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: function(i, node) {
                            return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
                        },
                        vLineWidth: function() { return 0.5; },
                        hLineColor: function(i) {
                            return (i === 0 || i === 1) ? '#1a4d2e' : '#cccccc';
                        },
                        vLineColor: function() { return '#cccccc'; },
                        fillColor: function(i) {
                            return (i === 0) ? '#1a4d2e' : null;
                        }
                    }
                },
                
                // Totaux
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 200,
                            stack: [
                                {
                                    columns: [
                                        { text: 'Total HT:', style: 'totalLabel', width: 100 },
                                        { text: formatCurrencyPDF(devis.montant_ht), style: 'totalValue', width: 100, alignment: 'right' }
                                    ],
                                    margin: [0, 10, 0, 5]
                                },
                                {
                                    columns: [
                                        { text: `TVA (${devis.taux_tva}%):`, style: 'totalLabel', width: 100 },
                                        { text: formatCurrencyPDF(devis.montant_tva), style: 'totalValue', width: 100, alignment: 'right' }
                                    ],
                                    margin: [0, 0, 0, 10]
                                },
                                {
                                    canvas: [
                                        {
                                            type: 'line',
                                            x1: 0, y1: 0,
                                            x2: 200, y2: 0,
                                            lineWidth: 1,
                                            lineColor: '#1a4d2e'
                                        }
                                    ],
                                    margin: [0, 0, 0, 10]
                                },
                                {
                                    columns: [
                                        { text: 'Total TTC:', style: 'totalLabelFinal', width: 100 },
                                        { text: formatCurrencyPDF(devis.montant_ttc), style: 'totalValueFinal', width: 100, alignment: 'right' }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                
                // Notes et conditions
                devis.notes ? {
                    text: 'NOTES',
                    style: 'sectionTitle',
                    margin: [0, 20, 0, 5]
                } : {},
                devis.notes ? {
                    text: devis.notes,
                    style: 'notes',
                    margin: [0, 0, 0, 10]
                } : {},
                
                {
                    text: 'CONDITIONS GÉNÉRALES',
                    style: 'sectionTitle',
                    margin: [0, 20, 0, 5]
                },
                {
                    text: devis.conditions || 'Devis valable 30 jours. Règlement à réception de facture. Tout devis accepté suppose l\'adhésion aux conditions générales de vente disponibles sur simple demande.',
                    style: 'conditions'
                }
            ],
            
            // Styles
            styles: {
                title: {
                    fontSize: 24,
                    bold: true,
                    color: '#1a4d2e',
                    alignment: 'center'
                },
                headerCompany: {
                    fontSize: 10,
                    color: '#666666'
                },
                headerPage: {
                    fontSize: 9,
                    color: '#999999'
                },
                footer: {
                    fontSize: 8,
                    color: '#999999'
                },
                companyName: {
                    fontSize: 12,
                    bold: true,
                    color: '#1a4d2e'
                },
                companyInfo: {
                    fontSize: 9,
                    color: '#666666',
                    margin: [0, 2, 0, 0]
                },
                devisNumber: {
                    fontSize: 16,
                    bold: true,
                    color: '#1a4d2e',
                    alignment: 'right'
                },
                dateInfo: {
                    fontSize: 10,
                    alignment: 'right',
                    margin: [0, 2, 0, 0]
                },
                statut: {
                    fontSize: 11,
                    bold: true,
                    alignment: 'right'
                },
                sectionTitle: {
                    fontSize: 12,
                    bold: true,
                    color: '#1a4d2e',
                    decoration: 'underline'
                },
                clientName: {
                    fontSize: 12,
                    bold: true
                },
                clientInfo: {
                    fontSize: 10,
                    color: '#666666',
                    margin: [0, 2, 0, 0]
                },
                tableHeader: {
                    fontSize: 10,
                    bold: true,
                    color: 'white',
                    fillColor: '#1a4d2e'
                },
                tableCell: {
                    fontSize: 9,
                    margin: [5, 5, 5, 5]
                },
                totalLabel: {
                    fontSize: 11
                },
                totalValue: {
                    fontSize: 11,
                    bold: true
                },
                totalLabelFinal: {
                    fontSize: 13,
                    bold: true,
                    color: '#1a4d2e'
                },
                totalValueFinal: {
                    fontSize: 14,
                    bold: true,
                    color: '#1a4d2e'
                },
                notes: {
                    fontSize: 9,
                    italics: true,
                    color: '#666666'
                },
                conditions: {
                    fontSize: 8,
                    color: '#999999',
                    italics: true
                }
            }
        };
        
        // Générer et télécharger le PDF
        pdfMake.createPdf(docDefinition).download(`Devis_${devis.numero}.pdf`);
        
        showNotification('✅ PDF du devis généré avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur génération PDF devis:', error);
        alert('Erreur lors de la génération du PDF: ' + error.message);
    }
}

// ============================================================================
// Générer PDF pour une FACTURE
// ============================================================================

async function genererPDFFacture(factureId) {
    try {
        // Charger les données de la facture
        const facture = await FacturesAPI.getById(factureId);
        const client = await ClientsAPI.getById(facture.client_id);
        
        // Calculer le reste à payer
        const resteAPayer = facture.montant_ttc - (facture.montant_paye || 0);
        
        // Charger le logo depuis les paramètres
        const parametres = await ParametresAPI.get();
        const logoImage = parametres.logo_base64;
        
        // Préparer le contenu du PDF
        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 60],
            
            header: function(currentPage, pageCount) {
                return {
                    columns: [
                        {
                            text: ENTREPRISE_CONFIG.nom,
                            style: 'headerCompany',
                            margin: [40, 20, 0, 0]
                        },
                        {
                            text: `Page ${currentPage} / ${pageCount}`,
                            alignment: 'right',
                            style: 'headerPage',
                            margin: [0, 20, 40, 0]
                        }
                    ]
                };
            },
            
            footer: function(currentPage, pageCount) {
                return {
                    columns: [
                        {
                            text: `${ENTREPRISE_CONFIG.nom} - SIRET: ${ENTREPRISE_CONFIG.siret} - TVA: ${ENTREPRISE_CONFIG.tva}`,
                            style: 'footer',
                            alignment: 'center',
                            margin: [40, 20, 40, 0]
                        }
                    ]
                };
            },
            
            content: [
                // Logo (si présent)
                ...( logoImage ? [{
                    image: logoImage,
                    width: 120,
                    alignment: 'center',
                    margin: [0, 0, 0, 20]
                }] : []),
                
                // Titre
                {
                    text: 'FACTURE',
                    style: 'title',
                    margin: [0, 0, 0, 10]
                },
                
                // Informations facture et entreprise
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                { text: ENTREPRISE_CONFIG.nom, style: 'companyName' },
                                { text: ENTREPRISE_CONFIG.adresse, style: 'companyInfo' },
                                { text: `${ENTREPRISE_CONFIG.code_postal} ${ENTREPRISE_CONFIG.ville}`, style: 'companyInfo' },
                                { text: `Tél: ${ENTREPRISE_CONFIG.telephone}`, style: 'companyInfo' },
                                { text: `Email: ${ENTREPRISE_CONFIG.email}`, style: 'companyInfo' }
                            ]
                        },
                        {
                            width: '50%',
                            stack: [
                                { text: `N° ${facture.numero}`, style: 'devisNumber' },
                                { text: `Date d'émission: ${formatDateFR(facture.date_emission)}`, style: 'dateInfo' },
                                { text: `Date d'échéance: ${formatDateFR(facture.date_echeance)}`, style: 'dateInfo' },
                                { 
                                    text: getStatutTextFacture(facture.statut), 
                                    style: 'statut',
                                    color: getStatutColorFacture(facture.statut),
                                    margin: [0, 5, 0, 0]
                                }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },
                
                // Client
                {
                    text: 'CLIENT',
                    style: 'sectionTitle',
                    margin: [0, 20, 0, 5]
                },
                {
                    stack: [
                        { text: client.raison_sociale, style: 'clientName' },
                        { text: client.adresse || '', style: 'clientInfo' },
                        { text: client.code_postal && client.ville ? `${client.code_postal} ${client.ville}` : '', style: 'clientInfo' },
                        { text: client.email || '', style: 'clientInfo' },
                        { text: client.telephone || '', style: 'clientInfo' }
                    ],
                    margin: [0, 0, 0, 20]
                },
                
                // Tableau des prestations
                {
                    text: 'PRESTATIONS',
                    style: 'sectionTitle',
                    margin: [0, 10, 0, 10]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 60, 70, 50, 70],
                        body: [
                            [
                                { text: 'Description', style: 'tableHeader' },
                                { text: 'Quantité', style: 'tableHeader', alignment: 'center' },
                                { text: 'Prix unitaire', style: 'tableHeader', alignment: 'right' },
                                { text: 'Remise', style: 'tableHeader', alignment: 'center' },
                                { text: 'Montant HT', style: 'tableHeader', alignment: 'right' }
                            ],
                            ...facture.lignes.map(ligne => [
                                { text: ligne.description, style: 'tableCell' },
                                { text: ligne.quantite.toFixed(2), style: 'tableCell', alignment: 'center' },
                                { text: formatCurrencyPDF(ligne.prix_unitaire), style: 'tableCell', alignment: 'right' },
                                { text: ligne.remise_pourcent > 0 ? `${ligne.remise_pourcent}%` : '-', style: 'tableCell', alignment: 'center' },
                                { text: formatCurrencyPDF(ligne.montant_ht), style: 'tableCell', alignment: 'right', bold: true }
                            ])
                        ]
                    },
                    layout: {
                        hLineWidth: function(i, node) {
                            return (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5;
                        },
                        vLineWidth: function() { return 0.5; },
                        hLineColor: function(i) {
                            return (i === 0 || i === 1) ? '#1a4d2e' : '#cccccc';
                        },
                        vLineColor: function() { return '#cccccc'; },
                        fillColor: function(i) {
                            return (i === 0) ? '#1a4d2e' : null;
                        }
                    }
                },
                
                // Totaux avec suivi paiement
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 220,
                            stack: [
                                {
                                    columns: [
                                        { text: 'Total HT:', style: 'totalLabel', width: 120 },
                                        { text: formatCurrencyPDF(facture.montant_ht), style: 'totalValue', width: 100, alignment: 'right' }
                                    ],
                                    margin: [0, 10, 0, 5]
                                },
                                {
                                    columns: [
                                        { text: `TVA (${facture.taux_tva}%):`, style: 'totalLabel', width: 120 },
                                        { text: formatCurrencyPDF(facture.montant_tva), style: 'totalValue', width: 100, alignment: 'right' }
                                    ],
                                    margin: [0, 0, 0, 10]
                                },
                                {
                                    canvas: [
                                        {
                                            type: 'line',
                                            x1: 0, y1: 0,
                                            x2: 220, y2: 0,
                                            lineWidth: 1,
                                            lineColor: '#1a4d2e'
                                        }
                                    ],
                                    margin: [0, 0, 0, 10]
                                },
                                {
                                    columns: [
                                        { text: 'Total TTC:', style: 'totalLabelFinal', width: 120 },
                                        { text: formatCurrencyPDF(facture.montant_ttc), style: 'totalValueFinal', width: 100, alignment: 'right' }
                                    ],
                                    margin: [0, 0, 0, 10]
                                },
                                ...(facture.montant_paye > 0 ? [
                                    {
                                        canvas: [
                                            {
                                                type: 'line',
                                                x1: 0, y1: 0,
                                                x2: 220, y2: 0,
                                                lineWidth: 0.5,
                                                lineColor: '#cccccc'
                                            }
                                        ],
                                        margin: [0, 0, 0, 5]
                                    },
                                    {
                                        columns: [
                                            { text: 'Déjà payé:', style: 'paidLabel', width: 120 },
                                            { text: formatCurrencyPDF(facture.montant_paye), style: 'paidValue', width: 100, alignment: 'right' }
                                        ],
                                        margin: [0, 0, 0, 5]
                                    },
                                    {
                                        columns: [
                                            { text: 'Reste à payer:', style: 'remainingLabel', width: 120 },
                                            { text: formatCurrencyPDF(resteAPayer), style: 'remainingValue', width: 100, alignment: 'right' }
                                        ]
                                    }
                                ] : [])
                            ]
                        }
                    ]
                },
                
                // Notes et conditions
                facture.notes ? {
                    text: 'NOTES',
                    style: 'sectionTitle',
                    margin: [0, 20, 0, 5]
                } : {},
                facture.notes ? {
                    text: facture.notes,
                    style: 'notes',
                    margin: [0, 0, 0, 10]
                } : {},
                
                {
                    text: 'CONDITIONS DE RÈGLEMENT',
                    style: 'sectionTitle',
                    margin: [0, 20, 0, 5]
                },
                {
                    text: facture.conditions_reglement || 'Paiement à 30 jours. Pénalités de retard : taux BCE + 10 points. Indemnité forfaitaire pour frais de recouvrement : 40€.',
                    style: 'conditions'
                }
            ],
            
            styles: {
                title: {
                    fontSize: 24,
                    bold: true,
                    color: '#1a4d2e',
                    alignment: 'center'
                },
                headerCompany: {
                    fontSize: 10,
                    color: '#666666'
                },
                headerPage: {
                    fontSize: 9,
                    color: '#999999'
                },
                footer: {
                    fontSize: 8,
                    color: '#999999'
                },
                companyName: {
                    fontSize: 12,
                    bold: true,
                    color: '#1a4d2e'
                },
                companyInfo: {
                    fontSize: 9,
                    color: '#666666',
                    margin: [0, 2, 0, 0]
                },
                devisNumber: {
                    fontSize: 16,
                    bold: true,
                    color: '#1a4d2e',
                    alignment: 'right'
                },
                dateInfo: {
                    fontSize: 10,
                    alignment: 'right',
                    margin: [0, 2, 0, 0]
                },
                statut: {
                    fontSize: 11,
                    bold: true,
                    alignment: 'right'
                },
                sectionTitle: {
                    fontSize: 12,
                    bold: true,
                    color: '#1a4d2e',
                    decoration: 'underline'
                },
                clientName: {
                    fontSize: 12,
                    bold: true
                },
                clientInfo: {
                    fontSize: 10,
                    color: '#666666',
                    margin: [0, 2, 0, 0]
                },
                tableHeader: {
                    fontSize: 10,
                    bold: true,
                    color: 'white',
                    fillColor: '#1a4d2e'
                },
                tableCell: {
                    fontSize: 9,
                    margin: [5, 5, 5, 5]
                },
                totalLabel: {
                    fontSize: 11
                },
                totalValue: {
                    fontSize: 11,
                    bold: true
                },
                totalLabelFinal: {
                    fontSize: 13,
                    bold: true,
                    color: '#1a4d2e'
                },
                totalValueFinal: {
                    fontSize: 14,
                    bold: true,
                    color: '#1a4d2e'
                },
                paidLabel: {
                    fontSize: 10,
                    color: '#ef4444'
                },
                paidValue: {
                    fontSize: 10,
                    color: '#ef4444',
                    bold: true
                },
                remainingLabel: {
                    fontSize: 11,
                    color: '#f59e0b',
                    bold: true
                },
                remainingValue: {
                    fontSize: 12,
                    color: '#f59e0b',
                    bold: true
                },
                notes: {
                    fontSize: 9,
                    italics: true,
                    color: '#666666'
                },
                conditions: {
                    fontSize: 8,
                    color: '#999999',
                    italics: true
                }
            }
        };
        
        // Générer et télécharger le PDF
        pdfMake.createPdf(docDefinition).download(`Facture_${facture.numero}.pdf`);
        
        showNotification('✅ PDF de la facture généré avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur génération PDF facture:', error);
        alert('Erreur lors de la génération du PDF: ' + error.message);
    }
}

// ============================================================================
// Fonctions utilitaires
// ============================================================================

function formatDateFR(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrencyPDF(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount || 0);
}

function getStatutText(statut) {
    const statuts = {
        'brouillon': '📝 BROUILLON',
        'envoye': '📤 ENVOYÉ',
        'accepte': '✅ ACCEPTÉ',
        'refuse': '❌ REFUSÉ',
        'expire': '⏰ EXPIRÉ'
    };
    return statuts[statut] || statut.toUpperCase();
}

function getStatutColor(statut) {
    const colors = {
        'brouillon': '#3b82f6',
        'envoye': '#f59e0b',
        'accepte': '#10b981',
        'refuse': '#ef4444',
        'expire': '#6b7280'
    };
    return colors[statut] || '#000000';
}

function getStatutTextFacture(statut) {
    const statuts = {
        'brouillon': '📝 BROUILLON',
        'envoyee': '📤 ENVOYÉE',
        'payee': '✅ PAYÉE',
        'partiel': '💸 PAIEMENT PARTIEL',
        'retard': '⏰ EN RETARD',
        'annulee': '❌ ANNULÉE'
    };
    return statuts[statut] || statut.toUpperCase();
}

function getStatutColorFacture(statut) {
    const colors = {
        'brouillon': '#3b82f6',
        'envoyee': '#f59e0b',
        'payee': '#10b981',
        'partiel': '#f59e0b',
        'retard': '#ef4444',
        'annulee': '#6b7280'
    };
    return colors[statut] || '#000000';
}
