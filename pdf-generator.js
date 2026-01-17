/**
 * Module de génération PDF pour EMAPAIE
 * Génère des devis et factures au format PDF avec pdfMake
 */

// Configuration de l'entreprise
const ENTREPRISE_CONFIG = {
    nom: 'EMAPAIE',
    adresse: 'Votre adresse',
    code_postal: 'Code postal',
    ville: 'Ville',
    telephone: 'Téléphone',
    email: 'contact@emapaie.fr',
    siret: 'SIRET',
    tva: 'N° TVA'
};

// Couleur principale - BLEU ROI
const COULEUR_PRINCIPALE = '#1e40af';

/**
 * Génère le contenu du PDF pour un devis
 */
async function genererPDFDevis(devisId) {
    try {
        console.log('🔄 Génération PDF devis:', devisId);
        
        // Récupérer les données du devis
        const { data: devis, error: devisError } = await supabase
            .from('devis')
            .select(`
                *,
                client:clients(*)
            `)
            .eq('id', devisId)
            .single();

        if (devisError) throw devisError;
        if (!devis) throw new Error('Devis introuvable');

        // Récupérer les lignes du devis
        const { data: lignes, error: lignesError } = await supabase
            .from('devis_lignes')
            .select(`
                *,
                prestation:prestations(*)
            `)
            .eq('devis_id', devisId)
            .order('ordre');

        if (lignesError) throw lignesError;

        // Récupérer les paramètres entreprise (avec logo)
        const { data: parametres } = await supabase
            .from('parametres')
            .select('*')
            .single();

        // Utiliser les paramètres de la base ou les valeurs par défaut
        const entreprise = parametres || ENTREPRISE_CONFIG;

        // Préparer le contenu du PDF
        const docDefinition = creerDocumentDevis(devis, lignes, entreprise);
        
        // Générer et télécharger le PDF
        pdfMake.createPdf(docDefinition).download(`Devis_${devis.numero}.pdf`);
        
        console.log('✅ PDF généré avec succès');
        
    } catch (error) {
        console.error('❌ Erreur génération PDF:', error);
        alert('Erreur lors de la génération du PDF: ' + error.message);
    }
}

/**
 * Génère le contenu du PDF pour une facture
 */
async function genererPDFFacture(factureId) {
    try {
        console.log('🔄 Génération PDF facture:', factureId);
        
        // Récupérer les données de la facture
        const { data: facture, error: factureError } = await supabase
            .from('factures')
            .select(`
                *,
                client:clients(*)
            `)
            .eq('id', factureId)
            .single();

        if (factureError) throw factureError;
        if (!facture) throw new Error('Facture introuvable');

        // Récupérer les lignes de la facture
        const { data: lignes, error: lignesError } = await supabase
            .from('factures_lignes')
            .select(`
                *,
                prestation:prestations(*)
            `)
            .eq('facture_id', factureId)
            .order('ordre');

        if (lignesError) throw lignesError;

        // Récupérer les paramètres entreprise (avec logo)
        const { data: parametres } = await supabase
            .from('parametres')
            .select('*')
            .single();

        // Utiliser les paramètres de la base ou les valeurs par défaut
        const entreprise = parametres || ENTREPRISE_CONFIG;

        // Préparer le contenu du PDF
        const docDefinition = creerDocumentFacture(facture, lignes, entreprise);
        
        // Générer et télécharger le PDF
        pdfMake.createPdf(docDefinition).download(`Facture_${facture.numero}.pdf`);
        
        console.log('✅ PDF généré avec succès');
        
    } catch (error) {
        console.error('❌ Erreur génération PDF:', error);
        alert('Erreur lors de la génération du PDF: ' + error.message);
    }
}

/**
 * Crée la structure du document PDF pour un devis
 */
function creerDocumentDevis(devis, lignes, entreprise) {
    const content = [];

    // Logo si disponible
    if (entreprise.logo_base64) {
        content.push({
            image: entreprise.logo_base64,
            width: 120,
            alignment: 'left',
            margin: [0, 0, 0, 20]
        });
    }

    // En-tête avec informations entreprise et client
    content.push({
        columns: [
            {
                // Informations entreprise
                width: '50%',
                stack: [
                    { text: entreprise.adresse || '', style: 'entrepriseInfo' },
                    { text: `${entreprise.code_postal || ''} ${entreprise.ville || ''}`, style: 'entrepriseInfo' },
                    { text: `Tél: ${entreprise.telephone || ''}`, style: 'entrepriseInfo' },
                    { text: `Email: ${entreprise.email || ''}`, style: 'entrepriseInfo' },
                    { text: `SIRET: ${entreprise.siret || ''}`, style: 'entrepriseInfo' },
                    { text: `N° TVA: ${entreprise.tva || ''}`, style: 'entrepriseInfo' }
                ]
            },
            {
                // Informations client
                width: '50%',
                stack: [
                    { text: 'CLIENT', style: 'sectionTitle' },
                    { text: devis.client.raison_sociale || 'Client', style: 'clientNom' },
                    { text: devis.client.adresse || '', style: 'clientInfo' },
                    { text: `${devis.client.code_postal || ''} ${devis.client.ville || ''}`, style: 'clientInfo' },
                    { text: `SIRET: ${devis.client.siret || 'Non renseigné'}`, style: 'clientInfo' }
                ]
            }
        ],
        margin: [0, 0, 0, 30]
    });

    // Titre DEVIS avec numéro et statut
    content.push({
        columns: [
            { text: 'DEVIS', style: 'titre' },
            { 
                text: getStatutLabel(devis.statut), 
                style: 'statut',
                color: getStatutColor(devis.statut),
                alignment: 'right'
            }
        ],
        margin: [0, 0, 0, 20]
    });

    // Informations du devis
    content.push({
        columns: [
            {
                width: '50%',
                stack: [
                    { text: `N° ${devis.numero}`, style: 'info' },
                    { text: `Date d'émission: ${formatDate(devis.date_emission)}`, style: 'info' }
                ]
            },
            {
                width: '50%',
                stack: [
                    { text: `Date de validité: ${formatDate(devis.date_validite)}`, style: 'info', alignment: 'right' }
                ]
            }
        ],
        margin: [0, 0, 0, 30]
    });

    // Tableau des prestations
    const tableBody = [
        [
            { text: 'Prestation', style: 'tableHeader' },
            { text: 'Quantité', style: 'tableHeader', alignment: 'center' },
            { text: 'Prix unitaire', style: 'tableHeader', alignment: 'right' },
            { text: 'Remise', style: 'tableHeader', alignment: 'center' },
            { text: 'Total HT', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    lignes.forEach(ligne => {
        tableBody.push([
            { 
                text: [
                    { text: ligne.prestation.nom + '\n', bold: true },
                    { text: ligne.description || '', fontSize: 9, color: '#666' }
                ],
                margin: [0, 5, 0, 5]
            },
            { text: `${ligne.quantite} ${ligne.prestation.unite}`, alignment: 'center' },
            { text: formatCurrency(ligne.prix_unitaire), alignment: 'right' },
            { text: ligne.remise_pourcent ? `${ligne.remise_pourcent}%` : '-', alignment: 'center' },
            { text: formatCurrency(ligne.montant_ht), alignment: 'right', bold: true }
        ]);
    });

    content.push({
        table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody
        },
        layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb',
            fillColor: (rowIndex) => rowIndex === 0 ? COULEUR_PRINCIPALE : null
        },
        margin: [0, 0, 0, 20]
    });

    // Totaux
    content.push({
        columns: [
            { text: '', width: '*' },
            {
                width: 200,
                stack: [
                    {
                        columns: [
                            { text: 'Total HT:', style: 'totalLabel' },
                            { text: formatCurrency(devis.montant_ht), style: 'totalValue' }
                        ]
                    },
                    {
                        columns: [
                            { text: `TVA (${devis.tva_pourcent}%):`, style: 'totalLabel' },
                            { text: formatCurrency(devis.montant_tva), style: 'totalValue' }
                        ]
                    },
                    {
                        canvas: [
                            {
                                type: 'line',
                                x1: 0, y1: 5,
                                x2: 200, y2: 5,
                                lineWidth: 1,
                                lineColor: COULEUR_PRINCIPALE
                            }
                        ]
                    },
                    {
                        columns: [
                            { text: 'Total TTC:', style: 'totalLabelFinal' },
                            { text: formatCurrency(devis.montant_ttc), style: 'totalValueFinal' }
                        ],
                        margin: [0, 5, 0, 0]
                    }
                ]
            }
        ]
    });

    // Notes
    if (devis.notes) {
        content.push({
            text: 'Notes',
            style: 'sectionTitle',
            margin: [0, 30, 0, 10]
        });
        content.push({
            text: devis.notes,
            style: 'notes'
        });
    }

    // Conditions
    content.push({
        text: 'Conditions',
        style: 'sectionTitle',
        margin: [0, 30, 0, 10]
    });
    content.push({
        text: 'Ce devis est valable 30 jours à compter de la date d\'émission. Les prestations seront réalisées selon les conditions convenues. TVA non applicable, art. 293 B du CGI.',
        style: 'conditions'
    });

    return {
        content: content,
        styles: getPDFStyles(),
        defaultStyle: {
            font: 'Roboto'
        },
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60],
        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { 
                        text: `${entreprise.nom_entreprise || entreprise.nom} - ${entreprise.siret || ''}`, 
                        alignment: 'left',
                        fontSize: 8,
                        color: '#666'
                    },
                    { 
                        text: `Page ${currentPage} sur ${pageCount}`, 
                        alignment: 'right',
                        fontSize: 8,
                        color: '#666'
                    }
                ],
                margin: [40, 0, 40, 0]
            };
        }
    };
}

/**
 * Crée la structure du document PDF pour une facture
 */
function creerDocumentFacture(facture, lignes, entreprise) {
    const content = [];

    // Logo si disponible
    if (entreprise.logo_base64) {
        content.push({
            image: entreprise.logo_base64,
            width: 120,
            alignment: 'left',
            margin: [0, 0, 0, 20]
        });
    }

    // En-tête avec informations entreprise et client
    content.push({
        columns: [
            {
                // Informations entreprise
                width: '50%',
                stack: [
                    { text: entreprise.adresse || '', style: 'entrepriseInfo' },
                    { text: `${entreprise.code_postal || ''} ${entreprise.ville || ''}`, style: 'entrepriseInfo' },
                    { text: `Tél: ${entreprise.telephone || ''}`, style: 'entrepriseInfo' },
                    { text: `Email: ${entreprise.email || ''}`, style: 'entrepriseInfo' },
                    { text: `SIRET: ${entreprise.siret || ''}`, style: 'entrepriseInfo' },
                    { text: `N° TVA: ${entreprise.tva || ''}`, style: 'entrepriseInfo' }
                ]
            },
            {
                // Informations client
                width: '50%',
                stack: [
                    { text: 'CLIENT', style: 'sectionTitle' },
                    { text: facture.client.raison_sociale || 'Client', style: 'clientNom' },
                    { text: facture.client.adresse || '', style: 'clientInfo' },
                    { text: `${facture.client.code_postal || ''} ${facture.client.ville || ''}`, style: 'clientInfo' },
                    { text: `SIRET: ${facture.client.siret || 'Non renseigné'}`, style: 'clientInfo' }
                ]
            }
        ],
        margin: [0, 0, 0, 30]
    });

    // Titre FACTURE avec numéro et statut
    content.push({
        columns: [
            { text: 'FACTURE', style: 'titre' },
            { 
                text: getStatutFactureLabel(facture.statut), 
                style: 'statut',
                color: getStatutFactureColor(facture.statut),
                alignment: 'right'
            }
        ],
        margin: [0, 0, 0, 20]
    });

    // Informations de la facture
    content.push({
        columns: [
            {
                width: '50%',
                stack: [
                    { text: `N° ${facture.numero}`, style: 'info' },
                    { text: `Date d'émission: ${formatDate(facture.date_emission)}`, style: 'info' },
                    { text: `Date d'échéance: ${formatDate(facture.date_echeance)}`, style: 'info' }
                ]
            },
            {
                width: '50%',
                stack: [
                    { text: `Conditions de règlement: ${facture.conditions_reglement || '30 jours'}`, style: 'info', alignment: 'right' }
                ]
            }
        ],
        margin: [0, 0, 0, 30]
    });

    // Tableau des prestations
    const tableBody = [
        [
            { text: 'Prestation', style: 'tableHeader' },
            { text: 'Quantité', style: 'tableHeader', alignment: 'center' },
            { text: 'Prix unitaire', style: 'tableHeader', alignment: 'right' },
            { text: 'Remise', style: 'tableHeader', alignment: 'center' },
            { text: 'Total HT', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    lignes.forEach(ligne => {
        tableBody.push([
            { 
                text: [
                    { text: ligne.prestation.nom + '\n', bold: true },
                    { text: ligne.description || '', fontSize: 9, color: '#666' }
                ],
                margin: [0, 5, 0, 5]
            },
            { text: `${ligne.quantite} ${ligne.prestation.unite}`, alignment: 'center' },
            { text: formatCurrency(ligne.prix_unitaire), alignment: 'right' },
            { text: ligne.remise_pourcent ? `${ligne.remise_pourcent}%` : '-', alignment: 'center' },
            { text: formatCurrency(ligne.montant_ht), alignment: 'right', bold: true }
        ]);
    });

    content.push({
        table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody
        },
        layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb',
            fillColor: (rowIndex) => rowIndex === 0 ? COULEUR_PRINCIPALE : null
        },
        margin: [0, 0, 0, 20]
    });

    // Totaux avec suivi des paiements
    content.push({
        columns: [
            { text: '', width: '*' },
            {
                width: 200,
                stack: [
                    {
                        columns: [
                            { text: 'Total HT:', style: 'totalLabel' },
                            { text: formatCurrency(facture.montant_ht), style: 'totalValue' }
                        ]
                    },
                    {
                        columns: [
                            { text: `TVA (${facture.tva_pourcent}%):`, style: 'totalLabel' },
                            { text: formatCurrency(facture.montant_tva), style: 'totalValue' }
                        ]
                    },
                    {
                        canvas: [
                            {
                                type: 'line',
                                x1: 0, y1: 5,
                                x2: 200, y2: 5,
                                lineWidth: 1,
                                lineColor: COULEUR_PRINCIPALE
                            }
                        ]
                    },
                    {
                        columns: [
                            { text: 'Total TTC:', style: 'totalLabelFinal' },
                            { text: formatCurrency(facture.montant_ttc), style: 'totalValueFinal' }
                        ],
                        margin: [0, 5, 0, 10]
                    }
                ]
            }
        ]
    });

    // Suivi des paiements si montant payé > 0
    if (facture.montant_paye > 0) {
        content.push({
            columns: [
                { text: '', width: '*' },
                {
                    width: 200,
                    stack: [
                        {
                            canvas: [
                                {
                                    type: 'line',
                                    x1: 0, y1: 0,
                                    x2: 200, y2: 0,
                                    lineWidth: 1,
                                    lineColor: '#e5e7eb'
                                }
                            ],
                            margin: [0, 0, 0, 10]
                        },
                        {
                            columns: [
                                { text: 'Montant déjà payé:', style: 'totalLabel', color: '#dc2626' },
                                { text: formatCurrency(facture.montant_paye), style: 'totalValue', color: '#dc2626' }
                            ]
                        },
                        {
                            columns: [
                                { text: 'Reste à payer:', style: 'totalLabelFinal', color: '#ea580c' },
                                { text: formatCurrency(facture.montant_ttc - facture.montant_paye), style: 'totalValueFinal', color: '#ea580c' }
                            ],
                            margin: [0, 5, 0, 0]
                        }
                    ]
                }
            ]
        });
    }

    // Notes
    if (facture.notes) {
        content.push({
            text: 'Notes',
            style: 'sectionTitle',
            margin: [0, 30, 0, 10]
        });
        content.push({
            text: facture.notes,
            style: 'notes'
        });
    }

    // Conditions et mentions légales
    content.push({
        text: 'Conditions de règlement',
        style: 'sectionTitle',
        margin: [0, 30, 0, 10]
    });
    content.push({
        text: `Paiement à réception de facture. En cas de retard de paiement, des pénalités de retard au taux de 10% seront appliquées, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40€. TVA non applicable, art. 293 B du CGI.`,
        style: 'conditions'
    });

    return {
        content: content,
        styles: getPDFStyles(),
        defaultStyle: {
            font: 'Roboto'
        },
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60],
        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { 
                        text: `${entreprise.nom_entreprise || entreprise.nom} - ${entreprise.siret || ''}`, 
                        alignment: 'left',
                        fontSize: 8,
                        color: '#666'
                    },
                    { 
                        text: `Page ${currentPage} sur ${pageCount}`, 
                        alignment: 'right',
                        fontSize: 8,
                        color: '#666'
                    }
                ],
                margin: [40, 0, 40, 0]
            };
        }
    };
}

/**
 * Styles du PDF
 */
function getPDFStyles() {
    return {
        // En-têtes
        titre: {
            fontSize: 24,
            bold: true,
            color: COULEUR_PRINCIPALE,
            margin: [0, 0, 0, 5]
        },
        sectionTitle: {
            fontSize: 12,
            bold: true,
            color: COULEUR_PRINCIPALE,
            margin: [0, 10, 0, 5]
        },
        
        // Informations entreprise
        entrepriseNom: {
            fontSize: 14,
            bold: true,
            color: COULEUR_PRINCIPALE,
            margin: [0, 0, 0, 5]
        },
        entrepriseInfo: {
            fontSize: 9,
            color: '#666',
            margin: [0, 2, 0, 0]
        },
        
        // Informations client
        clientNom: {
            fontSize: 12,
            bold: true,
            margin: [0, 5, 0, 5]
        },
        clientInfo: {
            fontSize: 9,
            color: '#666',
            margin: [0, 2, 0, 0]
        },
        
        // Informations générales
        info: {
            fontSize: 10,
            margin: [0, 2, 0, 0]
        },
        
        // Statut
        statut: {
            fontSize: 14,
            bold: true,
            margin: [0, 5, 0, 0]
        },
        
        // Tableau
        tableHeader: {
            bold: true,
            fontSize: 10,
            color: 'white',
            fillColor: COULEUR_PRINCIPALE,
            margin: [5, 5, 5, 5]
        },
        
        // Totaux
        totalLabel: {
            fontSize: 11,
            alignment: 'right',
            margin: [0, 3, 10, 3]
        },
        totalValue: {
            fontSize: 11,
            alignment: 'right',
            margin: [0, 3, 0, 3]
        },
        totalLabelFinal: {
            fontSize: 13,
            bold: true,
            alignment: 'right',
            color: COULEUR_PRINCIPALE,
            margin: [0, 5, 10, 0]
        },
        totalValueFinal: {
            fontSize: 13,
            bold: true,
            alignment: 'right',
            color: COULEUR_PRINCIPALE,
            margin: [0, 5, 0, 0]
        },
        
        // Notes et conditions
        notes: {
            fontSize: 9,
            color: '#666',
            margin: [0, 5, 0, 0]
        },
        conditions: {
            fontSize: 8,
            color: '#666',
            italics: true,
            margin: [0, 5, 0, 0]
        }
    };
}

/**
 * Fonctions utilitaires
 */

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0,00 €';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function getStatutLabel(statut) {
    const labels = {
        'brouillon': 'BROUILLON',
        'envoye': 'ENVOYÉ',
        'accepte': 'ACCEPTÉ',
        'refuse': 'REFUSÉ',
        'expire': 'EXPIRÉ'
    };
    return labels[statut] || statut.toUpperCase();
}

function getStatutColor(statut) {
    const colors = {
        'brouillon': '#6b7280',
        'envoye': '#3b82f6',
        'accepte': '#10b981',
        'refuse': '#ef4444',
        'expire': '#f59e0b'
    };
    return colors[statut] || '#6b7280';
}

function getStatutFactureLabel(statut) {
    const labels = {
        'brouillon': 'BROUILLON',
        'envoyee': 'ENVOYÉE',
        'payee': 'PAYÉE',
        'partielle': 'PAIEMENT PARTIEL',
        'retard': 'EN RETARD',
        'annulee': 'ANNULÉE'
    };
    return labels[statut] || statut.toUpperCase();
}

function getStatutFactureColor(statut) {
    const colors = {
        'brouillon': '#6b7280',
        'envoyee': '#3b82f6',
        'payee': '#10b981',
        'partielle': '#f59e0b',
        'retard': '#ef4444',
        'annulee': '#6b7280'
    };
    return colors[statut] || '#6b7280';
}

console.log('✅ Module PDF chargé avec succès');
