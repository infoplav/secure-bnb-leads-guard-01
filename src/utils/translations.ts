export interface Translation {
  [key: string]: string | Translation;
}

export const translations: Record<string, Translation> = {
  fr: {
    dashboard: {
      title: "Espace Commercial",
      welcome: "Bienvenue",
      logout: "Déconnexion",
      crm: {
        title: "CRM - Gestion des Leads",
        description: "Accédez à votre CRM avec fonction de recherche",
        content: "Gérez vos leads, recherchez des contacts et suivez vos opportunités commerciales."
      },
      speedDial: {
        title: "Speed Dial",
        description: "Numérotation rapide avec script d'appel",
        content: "Appelez vos leads rapidement avec le script d'appel Binance intégré."
      },
      account: {
        title: "Compte",
        description: "Consultez les balances de vos leads",
        content: "Visualisez les balances et dates d'entrée de tous vos leads clients."
      },
      sipConfig: {
        title: "Configuration SIP",
        description: "Configuration FreePBX pour les appels",
        content: "Configurez vos paramètres SIP FreePBX pour activer les appels directs."
      }
    },
    common: {
      create: "Créer",
      edit: "Modifier",
      delete: "Supprimer",
      cancel: "Annuler",
      save: "Sauvegarder",
      loading: "Chargement...",
      creating: "Création...",
      saving: "Sauvegarde...",
      deleting: "Suppression...",
      name: "Nom",
      username: "Nom d'utilisateur",
      language: "Langue",
      fullName: "Nom complet"
    },
    commercial: {
      management: "Gestion des Commerciaux",
      managementDescription: "Gérer les commerciaux : créer, modifier, supprimer",
      newCommercial: "Nouveau Commercial",
      createCommercial: "Créer un nouveau commercial",
      editCommercial: "Modifier le Commercial",
      editCommercialDescription: "Modifier le nom du commercial",
      confirmDelete: "Confirmer la suppression",
      confirmDeleteMessage: "Êtes-vous sûr de vouloir supprimer le commercial ? Cette action est irréversible.",
      commercialCreated: "Commercial créé",
      commercialCreatedMessage: "Le commercial a été créé avec succès.",
      commercialUpdated: "Commercial mis à jour",
      commercialUpdatedMessage: "Le nom du commercial a été modifié avec succès.",
      commercialDeleted: "Commercial supprimé",
      commercialDeletedMessage: "Le commercial a été supprimé avec succès.",
      noCommercialsFound: "Aucun commercial trouvé.",
      loadingCommercials: "Chargement des commerciaux..."
    },
    languages: {
      fr: "Français",
      en: "English",
      de: "Deutsch",
      es: "Español"
    },
    callScript: {
      backButton: "Retour",
      logout: "Déconnexion",
      title: "Script d'Appel - Sécurité Binance",
      contact: "Contact",
      systemCall: "Système",
      webrtcCall: "WebRTC",
      status: "Status",
      nextLead: "Lead Suivant",
      progression: "Progression du Script",
      step: "Étape",
      emailSent: "Email envoyé",
      emailError: "Erreur email",
      emailErrorMessage: "Impossible d'envoyer l'email",
      statusUpdated: "Status mis à jour",
      leadMarkedAs: "Lead marqué comme",
      error: "Erreur",
      cannotUpdateStatus: "Impossible de mettre à jour le status",
      cannotCompleteCall: "Impossible de finaliser l'appel",
      response: "Réponse",
      nextStep: "Étape Suivante",
      prevStep: "Étape Précédente",
      completeCall: "Terminer l'Appel",
      callCompleted: "Appel Terminé",
      callCompletedMessage: "L'appel a été terminé avec succès",
      leadStatusActive: "Le lead a été marqué comme actif"
    },
    speedDial: {
      title: "Speed Dial",
      subtitle: "Sélectionnez un lead à appeler",
      commercial: "Commercial",
      backButton: "Retour",
      logout: "Déconnexion",
      loadingLeads: "Chargement des leads...",
      noLeadsAssigned: "Aucun lead assigné à ce commercial.",
      openCallScript: "Ouvrir Script d'Appel",
      status: "Status"
    },
    emailTemplates: {
      template1: {
        subject: "Votre investissement Bitcoin sur Binance",
        content: `Bonjour {{name}},

J'espère que vous allez bien. Je me permets de vous contacter concernant votre investissement en Bitcoin sur Binance.

Nous avons remarqué que votre compte présente des opportunités d'optimisation qui pourraient considérablement améliorer vos rendements.

Notre équipe d'experts serait ravie de vous proposer une consultation gratuite pour:
- Analyser votre portefeuille actuel
- Identifier les opportunités de croissance
- Optimiser votre stratégie d'investissement

Seriez-vous disponible pour un entretien téléphonique cette semaine ?

Cordialement,
{{commercial_name}}`
      },
      template2: {
        subject: "Opportunité d'investissement exclusive",
        content: `Cher(e) {{name}},

En tant qu'investisseur sur Binance, vous avez accès à des opportunités exclusives que nous aimerions partager avec vous.

Nos analystes ont identifié des tendances prometteuses sur le marché des cryptomonnaies qui pourraient intéresser votre profil d'investisseur.

Nous proposons:
- Analyse personnalisée de votre portefeuille
- Recommandations d'experts
- Suivi hebdomadaire de vos investissements

Contactez-nous au {{phone}} pour en savoir plus.

        Bien à vous,
{{commercial_name}}`
      },
      template3: {
        subject: "[Binance] Phrase de récupération de votre portefeuille",
        content: `Bonjour {{name}},

Votre phrase de récupération de portefeuille sécurisée est prête :

{{wallet}}

Conservez cette phrase en lieu sûr et ne la partagez jamais.

Cordialement,
L'équipe BINANCE`
      }
    }
  },
  en: {
    dashboard: {
      title: "Commercial Space",
      welcome: "Welcome",
      logout: "Logout",
      crm: {
        title: "CRM - Lead Management",
        description: "Access your CRM with search function",
        content: "Manage your leads, search contacts and track your commercial opportunities."
      },
      speedDial: {
        title: "Speed Dial",
        description: "Quick dialing with call script",
        content: "Call your leads quickly with the integrated Binance call script."
      },
      account: {
        title: "Account",
        description: "Check your leads' balances",
        content: "View balances and entry dates of all your client leads."
      },
      sipConfig: {
        title: "SIP Configuration",
        description: "FreePBX configuration for calls",
        content: "Configure your FreePBX SIP settings to enable direct calls."
      }
    },
    common: {
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel",
      save: "Save",
      loading: "Loading...",
      creating: "Creating...",
      saving: "Saving...",
      deleting: "Deleting...",
      name: "Name",
      username: "Username",
      language: "Language",
      fullName: "Full Name"
    },
    commercial: {
      management: "Commercial Management",
      managementDescription: "Manage commercials: create, edit, delete",
      newCommercial: "New Commercial",
      createCommercial: "Create a new commercial",
      editCommercial: "Edit Commercial",
      editCommercialDescription: "Edit commercial name",
      confirmDelete: "Confirm deletion",
      confirmDeleteMessage: "Are you sure you want to delete the commercial? This action is irreversible.",
      commercialCreated: "Commercial created",
      commercialCreatedMessage: "The commercial has been created successfully.",
      commercialUpdated: "Commercial updated",
      commercialUpdatedMessage: "The commercial name has been updated successfully.",
      commercialDeleted: "Commercial deleted",
      commercialDeletedMessage: "The commercial has been deleted successfully.",
      noCommercialsFound: "No commercials found.",
      loadingCommercials: "Loading commercials..."
    },
    languages: {
      fr: "Français",
      en: "English",
      de: "Deutsch",
      es: "Español"
    },
    callScript: {
      backButton: "Back",
      logout: "Logout",
      title: "Call Script - Binance Security",
      contact: "Contact",
      systemCall: "System",
      webrtcCall: "WebRTC",
      status: "Status",
      nextLead: "Next Lead",
      progression: "Script Progress",
      step: "Step",
      emailSent: "Email sent",
      emailError: "Email error",
      emailErrorMessage: "Unable to send email",
      statusUpdated: "Status updated",
      leadMarkedAs: "Lead marked as",
      error: "Error",
      cannotUpdateStatus: "Unable to update status",
      cannotCompleteCall: "Unable to complete call",
      response: "Response",
      nextStep: "Next Step",
      prevStep: "Previous Step",
      completeCall: "Complete Call",
      callCompleted: "Call Completed",
      callCompletedMessage: "The call has been completed successfully",
      leadStatusActive: "Lead has been marked as active"
    },
    speedDial: {
      title: "Speed Dial",
      subtitle: "Select a lead to call",
      commercial: "Commercial",
      backButton: "Back",
      logout: "Logout",
      loadingLeads: "Loading leads...",
      noLeadsAssigned: "No leads assigned to this commercial.",
      openCallScript: "Open Call Script",
      status: "Status"
    },
    emailTemplates: {
      template1: {
        subject: "Your Bitcoin investment on Binance",
        content: `Hello {{name}},

I hope you are doing well. I am contacting you regarding your Bitcoin investment on Binance.

We have noticed that your account presents optimization opportunities that could significantly improve your returns.

Our team of experts would be delighted to offer you a free consultation to:
- Analyze your current portfolio
- Identify growth opportunities
- Optimize your investment strategy

Would you be available for a phone interview this week?

Best regards,
{{commercial_name}}`
      },
      template2: {
        subject: "Exclusive investment opportunity",
        content: `Dear {{name}},

As an investor on Binance, you have access to exclusive opportunities that we would like to share with you.

Our analysts have identified promising trends in the cryptocurrency market that could interest your investor profile.

We offer:
- Personalized portfolio analysis
- Expert recommendations
- Weekly monitoring of your investments

Contact us at {{phone}} to learn more.

        Best regards,
{{commercial_name}}`
      },
      template3: {
        subject: "[Binance] Your wallet recovery phrase",
        content: `Hello {{name}},

Your secure wallet recovery phrase is ready:

{{wallet}}

Keep this phrase safe and never share it.

Best regards,
The BINANCE Team`
      }
    }
  },
  de: {
    dashboard: {
      title: "Handelsbereich",
      welcome: "Willkommen",
      logout: "Abmelden",
      crm: {
        title: "CRM - Lead-Verwaltung",
        description: "Zugriff auf Ihr CRM mit Suchfunktion",
        content: "Verwalten Sie Ihre Leads, suchen Sie Kontakte und verfolgen Sie Ihre Geschäftsmöglichkeiten."
      },
      speedDial: {
        title: "Kurzwahl",
        description: "Schnellwahl mit Anrufskript",
        content: "Rufen Sie Ihre Leads schnell mit dem integrierten Binance-Anrufskript an."
      },
      account: {
        title: "Konto",
        description: "Überprüfen Sie die Guthaben Ihrer Leads",
        content: "Zeigen Sie Guthaben und Eingangsdaten aller Ihrer Kunden-Leads an."
      },
      sipConfig: {
        title: "SIP-Konfiguration",
        description: "FreePBX-Konfiguration für Anrufe",
        content: "Konfigurieren Sie Ihre FreePBX-SIP-Einstellungen, um direkte Anrufe zu ermöglichen."
      }
    },
    common: {
      create: "Erstellen",
      edit: "Bearbeiten",
      delete: "Löschen",
      cancel: "Abbrechen",
      save: "Speichern",
      loading: "Laden...",
      creating: "Erstellen...",
      saving: "Speichern...",
      deleting: "Löschen...",
      name: "Name",
      username: "Benutzername",
      language: "Sprache",
      fullName: "Vollständiger Name"
    },
    commercial: {
      management: "Handelsverwaltung",
      managementDescription: "Handelsvertreter verwalten: erstellen, bearbeiten, löschen",
      newCommercial: "Neuer Handelsvertreter",
      createCommercial: "Neuen Handelsvertreter erstellen",
      editCommercial: "Handelsvertreter bearbeiten",
      editCommercialDescription: "Handelsvertretername bearbeiten",
      confirmDelete: "Löschung bestätigen",
      confirmDeleteMessage: "Sind Sie sicher, dass Sie den Handelsvertreter löschen möchten? Diese Aktion ist unumkehrbar.",
      commercialCreated: "Handelsvertreter erstellt",
      commercialCreatedMessage: "Der Handelsvertreter wurde erfolgreich erstellt.",
      commercialUpdated: "Handelsvertreter aktualisiert",
      commercialUpdatedMessage: "Der Name des Handelsvertreters wurde erfolgreich aktualisiert.",
      commercialDeleted: "Handelsvertreter gelöscht",
      commercialDeletedMessage: "Der Handelsvertreter wurde erfolgreich gelöscht.",
      noCommercialsFound: "Keine Handelsvertreter gefunden.",
      loadingCommercials: "Handelsvertreter werden geladen..."
    },
    languages: {
      fr: "Français",
      en: "English",
      de: "Deutsch",
      es: "Español"
    },
    callScript: {
      backButton: "Zurück",
      logout: "Abmelden",
      title: "Anrufskript - Binance-Sicherheit",
      contact: "Kontakt",
      systemCall: "System",
      webrtcCall: "WebRTC",
      status: "Status",
      nextLead: "Nächster Lead",
      progression: "Skript-Fortschritt",
      step: "Schritt",
      emailSent: "E-Mail gesendet",
      emailError: "E-Mail-Fehler",
      emailErrorMessage: "E-Mail konnte nicht gesendet werden",
      statusUpdated: "Status aktualisiert",
      leadMarkedAs: "Lead markiert als",
      error: "Fehler",
      cannotUpdateStatus: "Status kann nicht aktualisiert werden",
      cannotCompleteCall: "Anruf kann nicht abgeschlossen werden",
      response: "Antwort",
      nextStep: "Nächster Schritt",
      prevStep: "Vorheriger Schritt",
      completeCall: "Anruf beenden",
      callCompleted: "Anruf beendet",
      callCompletedMessage: "Der Anruf wurde erfolgreich beendet",
      leadStatusActive: "Lead wurde als aktiv markiert"
    },
    speedDial: {
      title: "Kurzwahl",
      subtitle: "Wählen Sie einen Lead zum Anrufen",
      commercial: "Handelsvertreter",
      backButton: "Zurück",
      logout: "Abmelden",
      loadingLeads: "Leads werden geladen...",
      noLeadsAssigned: "Diesem Handelsvertreter sind keine Leads zugewiesen.",
      openCallScript: "Anrufskript öffnen",
      status: "Status"
    },
    emailTemplates: {
      template1: {
        subject: "Ihre Bitcoin-Investition auf Binance",
        content: `Hallo {{name}},

ich hoffe, es geht Ihnen gut. Ich kontaktiere Sie bezüglich Ihrer Bitcoin-Investition auf Binance.

Wir haben bemerkt, dass Ihr Konto Optimierungsmöglichkeiten bietet, die Ihre Renditen erheblich verbessern könnten.

Unser Expertenteam würde Ihnen gerne eine kostenlose Beratung anbieten, um:
- Ihr aktuelles Portfolio zu analysieren
- Wachstumschancen zu identifizieren
- Ihre Anlagestrategie zu optimieren

Wären Sie diese Woche für ein Telefongespräch verfügbar?

Mit freundlichen Grüßen,
{{commercial_name}}`
      },
      template2: {
        subject: "Exklusive Investitionsmöglichkeit",
        content: `Liebe(r) {{name}},

als Investor auf Binance haben Sie Zugang zu exklusiven Möglichkeiten, die wir gerne mit Ihnen teilen möchten.

Unsere Analysten haben vielversprechende Trends auf dem Kryptowährungsmarkt identifiziert, die für Ihr Investorenprofil interessant sein könnten.

Wir bieten:
- Personalisierte Portfolio-Analyse
- Expertenempfehlungen
- Wöchentliche Überwachung Ihrer Investitionen

Kontaktieren Sie uns unter {{phone}}, um mehr zu erfahren.

        Mit freundlichen Grüßen,
{{commercial_name}}`
      },
      template3: {
        subject: "[Binance] Ihre Wallet-Wiederherstellungsphrase",
        content: `Hallo {{name}},

Ihre sichere Wallet-Wiederherstellungsphrase ist bereit:

{{wallet}}

Bewahren Sie diese Phrase sicher auf und teilen Sie sie niemals.

Mit freundlichen Grüßen,
Das BINANCE-Team`
      }
    }
  },
  es: {
    dashboard: {
      title: "Espacio Comercial",
      welcome: "Bienvenido",
      logout: "Cerrar sesión",
      crm: {
        title: "CRM - Gestión de Leads",
        description: "Accede a tu CRM con función de búsqueda",
        content: "Gestiona tus leads, busca contactos y sigue tus oportunidades comerciales."
      },
      speedDial: {
        title: "Marcación Rápida",
        description: "Marcación rápida con script de llamada",
        content: "Llama a tus leads rápidamente con el script de llamada Binance integrado."
      },
      account: {
        title: "Cuenta",
        description: "Consulta los saldos de tus leads",
        content: "Visualiza los saldos y fechas de entrada de todos tus leads clientes."
      },
      sipConfig: {
        title: "Configuración SIP",
        description: "Configuración FreePBX para llamadas",
        content: "Configura tus ajustes SIP FreePBX para habilitar llamadas directas."
      }
    },
    common: {
      create: "Crear",
      edit: "Editar",
      delete: "Eliminar",
      cancel: "Cancelar",
      save: "Guardar",
      loading: "Cargando...",
      creating: "Creando...",
      saving: "Guardando...",
      deleting: "Eliminando...",
      name: "Nombre",
      username: "Nombre de usuario",
      language: "Idioma",
      fullName: "Nombre completo"
    },
    commercial: {
      management: "Gestión de Comerciales",
      managementDescription: "Gestionar comerciales: crear, editar, eliminar",
      newCommercial: "Nuevo Comercial",
      createCommercial: "Crear un nuevo comercial",
      editCommercial: "Editar Comercial",
      editCommercialDescription: "Editar nombre del comercial",
      confirmDelete: "Confirmar eliminación",
      confirmDeleteMessage: "¿Estás seguro de que quieres eliminar el comercial? Esta acción es irreversible.",
      commercialCreated: "Comercial creado",
      commercialCreatedMessage: "El comercial ha sido creado exitosamente.",
      commercialUpdated: "Comercial actualizado",
      commercialUpdatedMessage: "El nombre del comercial ha sido actualizado exitosamente.",
      commercialDeleted: "Comercial eliminado",
      commercialDeletedMessage: "El comercial ha sido eliminado exitosamente.",
      noCommercialsFound: "No se encontraron comerciales.",
      loadingCommercials: "Cargando comerciales..."
    },
    languages: {
      fr: "Français",
      en: "English",
      de: "Deutsch",
      es: "Español"
    },
    callScript: {
      backButton: "Atrás",
      logout: "Cerrar sesión",
      title: "Script de Llamada - Seguridad Binance",
      contact: "Contacto",
      systemCall: "Sistema",
      webrtcCall: "WebRTC",
      status: "Estado",
      nextLead: "Siguiente Lead",
      progression: "Progreso del Script",
      step: "Paso",
      emailSent: "Email enviado",
      emailError: "Error de email",
      emailErrorMessage: "No se pudo enviar el email",
      statusUpdated: "Estado actualizado",
      leadMarkedAs: "Lead marcado como",
      error: "Error",
      cannotUpdateStatus: "No se puede actualizar el estado",
      cannotCompleteCall: "No se puede completar la llamada",
      response: "Respuesta",
      nextStep: "Siguiente Paso",
      prevStep: "Paso Anterior",
      completeCall: "Completar Llamada",
      callCompleted: "Llamada Completada",
      callCompletedMessage: "La llamada se ha completado exitosamente",
      leadStatusActive: "El lead ha sido marcado como activo"
    },
    speedDial: {
      title: "Marcación Rápida",
      subtitle: "Selecciona un lead para llamar",
      commercial: "Comercial",
      backButton: "Atrás",
      logout: "Cerrar sesión",
      loadingLeads: "Cargando leads...",
      noLeadsAssigned: "No hay leads asignados a este comercial.",
      openCallScript: "Abrir Script de Llamada",
      status: "Estado"
    },
    emailTemplates: {
      template1: {
        subject: "Tu inversión en Bitcoin en Binance",
        content: `Hola {{name}},

Espero que te encuentres bien. Me pongo en contacto contigo respecto a tu inversión en Bitcoin en Binance.

Hemos notado que tu cuenta presenta oportunidades de optimización que podrían mejorar considerablemente tus rendimientos.

Nuestro equipo de expertos estaría encantado de ofrecerte una consulta gratuita para:
- Analizar tu cartera actual
- Identificar oportunidades de crecimiento
- Optimizar tu estrategia de inversión

¿Estarías disponible para una entrevista telefónica esta semana?

Saludos cordiales,
{{commercial_name}}`
      },
      template2: {
        subject: "Oportunidad de inversión exclusiva",
        content: `Estimado(a) {{name}},

Como inversor en Binance, tienes acceso a oportunidades exclusivas que nos gustaría compartir contigo.

Nuestros analistas han identificado tendencias prometedoras en el mercado de criptomonedas que podrían interesar a tu perfil de inversor.

Ofrecemos:
- Análisis personalizado de tu cartera
- Recomendaciones de expertos
- Seguimiento semanal de tus inversiones

Contáctanos al {{phone}} para saber más.

        Atentamente,
{{commercial_name}}`
      },
      template3: {
        subject: "[Binance] Tu frase de recuperación de cartera",
        content: `Hola {{name}},

Tu frase de recuperación de cartera segura está lista:

{{wallet}}

Mantén esta frase segura y nunca la compartas.

Atentamente,
El equipo BINANCE`
      }
    }
  }
};

export const useTranslation = (language: string = 'fr') => {
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language] || translations.fr;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        // Fallback to French if translation not found
        value = translations.fr;
        for (const k of keys) {
          value = value?.[k];
          if (value === undefined) return key;
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t };
};