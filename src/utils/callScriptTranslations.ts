interface ScriptStep {
  id: number;
  title: string;
  content: string;
  action: string;
  options?: Array<{
    value: string;
    label: string;
    response: string;
  }>;
  hasEmail?: boolean;
  emailLabel?: string;
}

export const getCallScript = (language: string = 'fr', leadName: string, commercialName: string): ScriptStep[] => {
  const scripts: Record<string, ScriptStep[]> = {
    fr: [
      {
        id: 1,
        title: "Étape 1 : Introduction & Prise de contact",
        content: `Bonjour Monsieur/Madame ${leadName},

Je me présente : ${commercialName}, du service technique et vigilance Binance.

Je vous contacte aujourd'hui uniquement à titre préventif pour votre sécurité. J'espère que je ne vous dérange pas.

Si je vous appelle, c'est parce que nous avons détecté deux connexions inhabituelles à votre compte Binance, provenant d'un nouvel appareil non reconnu par notre système.
Ces connexions ont été localisées à Berlin, en Allemagne.

🎯 Objectif : Vérifier si le client est à l'origine de ces connexions.

QUESTION : Pouvez-vous me confirmer si vous êtes à l'origine de ces connexions ?`,
        action: "Attendre la réponse du client",
        options: [
          { value: "non", label: "NON", response: "Je comprends… Dans ce cas, voici la situation :" },
          { value: "oui", label: "OUI", response: "Je vais quand même procéder à quelques vérifications de sécurité pour m'assurer que tout est en ordre." }
        ]
      },
      {
        id: 2,
        title: "Étape 2 : Détection d'appareil suspect",
        content: `Plus tôt dans la journée, un nouvel outil de confiance a été ajouté à votre compte. Il s'agit d'un appareil Oppo A72.

🎯 Objectif : Vérifier si cet appareil appartient au client.

QUESTION : Est-ce que cet appareil vous appartient ?`,
        action: "Attendre la réponse du client",
        options: [
          { value: "non", label: "NON", response: "Très bien. Nous allons donc procéder immédiatement à sa désynchronisation." },
          { value: "oui", label: "OUI", response: "Je vais quand même procéder à quelques vérifications de sécurité pour m'assurer que tout est en ordre." }
        ]
      },
      {
        id: 3,
        title: "Étape 3 : Questions de vérification",
        content: `Pour rappel, cet appel est enregistré de bout en bout et nous ne vous demanderons jamais vos identifiants, mots de passe ou codes de sécurité.

Avant de valider la désynchronisation, j'ai juste deux questions rapides :

1️⃣ Utilisez-vous régulièrement un VPN pour vous connecter à Binance, ce qui pourrait fausser la localisation ?

2️⃣ Avez-vous prêté, vendu ou donné un ancien appareil qui était lié à votre compte Binance ?

Parfait. Nous allons maintenant retirer cet appareil de votre liste de confiance pour sécuriser votre compte.`,
        action: "Noter les réponses et procéder à la sécurisation"
      },
      {
        id: 4,
        title: "Étape 4 : Questions de diagnostic (Optionnel)",
        content: `Posez les questions suivantes si nécessaire :

• Êtes-vous actuellement dans votre pays de résidence ou à l'étranger ?

• Utilisez-vous un VPN pour vous connecter à Binance ?
  (Si oui) Êtes-vous connecté depuis l'Inde via ce VPN ?

• Vous êtes-vous connecté récemment à un réseau public (hôtel, aéroport, gare, etc.) ?

• Avez-vous cliqué sur un lien suspect (email, site douteux, pub adulte, etc.) ?

• Votre dernière connexion à l'appli Binance remonte à quand exactement ?

(Si le client semble réticent à répondre)
"Je vous rassure, l'objectif n'est pas de vous incriminer, mais bien de protéger votre compte."`,
        action: "Noter les réponses pour le diagnostic"
      },
      {
        id: 3,
        title: "Étape 3 : Alerte de sécurité",
        content: `Il est possible que des hackeurs aient accédé à votre portefeuille via la SmartChain.

Binance ne peut retracer ni récupérer des crypto volées, d'où l'importance d'agir immédiatement.

⚠️ Conformément à la politique Binance, cet appel est enregistré. En cas de report, Binance décline toute responsabilité.`,
        action: "Expliquer l'urgence de la situation"
      },
      {
        id: 4,
        title: "Étape 4 : Vérification de compte sur l'application Binance",
        content: `Demandez-lui d'ouvrir son application :

"Veuillez aller dans Portefeuille > Actifs et vérifier s'il y a eu des transactions dans les dernières 48h."

(Attendez la confirmation)

Rien d'anormal ? Parfait.
Nous allons donc activer le système de protection renforcée immédiatement.`,
        action: "Attendre la vérification du portefeuille"
      },
      {
        id: 5,
        title: "Étape 5 : Installation WireGuard (Manuel)",
        content: `Veuillez suivre le manuel d'installation jusqu'au bout.
Au moment de saisir l'IP de confiance, indiquez-lui bien que cela restreint l'accès aux hackers.

✅ Autorisations à cocher :
• Transferts universels
• Trade Spot  
• Retraits

C'est essentiel pour que la protection couvre toutes les opérations.`,
        action: "Guider l'installation WireGuard",
        hasEmail: true,
        emailLabel: "Envoyer Email 1 (Installation)"
      },
      {
        id: 6,
        title: "Étape 6 : Création de la Clé API",
        content: `✅ ORDINATEUR (résumé) :
• Compte > Gestion API
• Créer une API > Cliquer sur Suivant
• Nommer la clé : API + 4 chiffres (ex : API1247)
• Valider les exigences de sécurité
• Copier clé API + clé secrète
• Cliquer sur Modifier les restrictions
• Entrer l'IP WireGuard et cocher :
  - Permettre les transferts universels
  - Activer le trading spot et sur marge
  - Activer les retraits
  - Activer les prêts sur marge
❌ Ne pas cocher « liste blanche des symboles »
• Sauvegarder

✅ TÉLÉPHONE (résumé) :
• Logo Binance > Plus de services > Autres > Gestion API
• Créer une API > Suivant > Nommer (API + 4 chiffres)
• Valider les exigences de sécurité
• Copier les clés > Modifier la clé
• Entrer IP WireGuard
• Cocher les 4 protections + sauvegarder`,
        action: "Guider la création de l'API selon le support utilisé"
      },
      {
        id: 7,
        title: "Étape 7 : Activation de la protection",
        content: `Vous allez recevoir un email ou SMS d'activation de Binance.

Avez-vous reçu le lien ? Si oui, collez la clé et activez la protection.

(Si problème d'adresse mail : proposer changement sécurisé)`,
        action: "Attendre la confirmation d'activation",
        hasEmail: true,
        emailLabel: "Envoyer Email 2 (Activation)"
      },
      {
        id: 8,
        title: "Étape 8 : Finalisation",
        content: `Parfait, je lance maintenant la mise à jour de votre application.

Le système WireGuard est maintenant actif.

Votre compte est 100% sécurisé.

🛡️ Fin de l'appel :
N'hésitez pas à nous recontacter si vous remarquez un comportement suspect à nouveau.

Excellente journée à vous, Monsieur/Madame ${leadName}.`,
        action: "Conclure l'appel de manière professionnelle"
      }
    ],
    en: [
      {
        id: 1,
        title: "Step 1: Introduction & Contact",
        content: `Hello Mr./Mrs. ${leadName},

My name is ${commercialName}, from the Binance technical and surveillance service.

I am contacting you today purely as a preventive measure for your security. I hope I'm not disturbing you.

If I'm calling you, it's because we have detected two unusual connections to your Binance account, from a new device not recognized by our system.
These connections have been located in Berlin, Germany.

🎯 Objective: Verify if the client is the source of these connections.

QUESTION: Can you confirm if you are the source of these connections?`,
        action: "Wait for client response",
        options: [
          { value: "non", label: "NO", response: "I understand... In that case, here's the situation:" },
          { value: "oui", label: "YES", response: "I'll still proceed with some security checks to make sure everything is in order." }
        ]
      },
      {
        id: 2,
        title: "Step 2: Diagnostic Questions",
        content: `Ask the following questions calmly:

• Are you currently in your country of residence or abroad?

• Do you use a VPN to connect to Binance?
  (If yes) Are you connected from India via this VPN?

• Have you recently connected to a public network (hotel, airport, station, etc.)?

• Have you clicked on a suspicious link (email, dubious site, adult ad, etc.)?

• When was your last connection to the Binance app exactly?

(If the client seems reluctant to answer)
"I assure you, the objective is not to incriminate you, but to protect your account."`,
        action: "Note the responses for diagnosis"
      },
      {
        id: 3,
        title: "Step 3: Security Alert",
        content: `It's possible that hackers have accessed your wallet via SmartChain.

Binance cannot trace or recover stolen crypto, hence the importance of acting immediately.

⚠️ In accordance with Binance policy, this call is recorded. In case of postponement, Binance declines any responsibility.`,
        action: "Explain the urgency of the situation"
      },
      {
        id: 4,
        title: "Step 4: Account Verification on Binance Application",
        content: `Ask them to open their application:

"Please go to Wallet > Assets and check if there have been any transactions in the last 48h."

(Wait for confirmation)

Nothing abnormal? Perfect.
We will therefore activate the enhanced protection system immediately.`,
        action: "Wait for wallet verification"
      },
      {
        id: 5,
        title: "Step 5: WireGuard Installation (Manual)",
        content: `Please follow the installation manual to the end.
When entering the trusted IP, make sure to tell them that this restricts hacker access.

✅ Permissions to check:
• Universal transfers
• Spot trading
• Withdrawals

This is essential for the protection to cover all operations.`,
        action: "Guide WireGuard installation",
        hasEmail: true,
        emailLabel: "Send Email 1 (Installation)"
      },
      {
        id: 6,
        title: "Step 6: API Key Creation",
        content: `✅ COMPUTER (summary):
• Account > API Management
• Create API > Click Next
• Name the key: API + 4 digits (e.g.: API1247)
• Validate security requirements
• Copy API key + secret key
• Click Edit restrictions
• Enter WireGuard IP and check:
  - Allow universal transfers
  - Enable spot and margin trading
  - Enable withdrawals
  - Enable margin loans
❌ Do not check "symbol whitelist"
• Save

✅ PHONE (summary):
• Binance logo > More services > Others > API Management
• Create API > Next > Name (API + 4 digits)
• Validate security requirements
• Copy keys > Edit key
• Enter WireGuard IP
• Check the 4 protections + save`,
        action: "Guide API creation according to the device used"
      },
      {
        id: 7,
        title: "Step 7: Protection Activation",
        content: `You will receive an activation email or SMS from Binance.

Have you received the link? If yes, paste the key and activate the protection.

(If email address problem: propose secure change)`,
        action: "Wait for activation confirmation",
        hasEmail: true,
        emailLabel: "Send Email 2 (Activation)"
      },
      {
        id: 8,
        title: "Step 8: Finalization",
        content: `Perfect, I'm now launching the update of your application.

The WireGuard system is now active.

Your account is 100% secure.

🛡️ End of call:
Don't hesitate to contact us again if you notice suspicious behavior again.

Have an excellent day, Mr./Mrs. ${leadName}.`,
        action: "Conclude the call professionally"
      }
    ],
    de: [
      {
        id: 1,
        title: "Schritt 1: Einführung & Kontaktaufnahme",
        content: `Hallo Herr/Frau ${leadName},

${commercialName} am Telefon, vom Binance Betrugs-Sicherheitsdienst.

Ich rufe Sie an, weil wir eine Sicherheitswarnung erhalten haben bezüglich eines Verbindungsversuchs zu Ihrem Konto über eine neue IP, geolokalisiert in Indien (Mumbai).

🎯 Ziel: Überprüfen, ob der Kunde die Quelle dieser Verbindung ist.

FRAGE: Sind Sie die Quelle dieser Verbindung?`,
        action: "Auf Kundenantwort warten",
        options: [
          { value: "non", label: "NEIN", response: "In Ordnung, das dachte ich mir. Wir werden gemeinsam einige Überprüfungen durchführen." },
          { value: "oui", label: "JA", response: "Ich werde trotzdem einige Sicherheitsprüfungen durchführen, um sicherzustellen, dass alles in Ordnung ist." }
        ]
      },
      {
        id: 2,
        title: "Schritt 2: Diagnosefragen",
        content: `Stellen Sie die folgenden Fragen ruhig:

• Sind Sie derzeit in Ihrem Wohnsitzland oder im Ausland?

• Verwenden Sie ein VPN, um sich mit Binance zu verbinden?
  (Falls ja) Sind Sie über dieses VPN aus Indien verbunden?

• Haben Sie sich kürzlich mit einem öffentlichen Netzwerk verbunden (Hotel, Flughafen, Bahnhof, etc.)?

• Haben Sie auf einen verdächtigen Link geklickt (E-Mail, zweifelhafte Seite, Erwachsenenwerbung, etc.)?

• Wann war Ihre letzte Verbindung zur Binance-App genau?

(Falls der Kunde zögerlich zu antworten scheint)
"Ich versichere Ihnen, das Ziel ist nicht, Sie zu belasten, sondern Ihr Konto zu schützen."`,
        action: "Antworten für Diagnose notieren"
      },
      {
        id: 3,
        title: "Schritt 3: Sicherheitswarnung",
        content: `Es ist möglich, dass Hacker über SmartChain auf Ihr Wallet zugegriffen haben.

Binance kann gestohlene Krypto nicht verfolgen oder wiederherstellen, daher die Wichtigkeit sofortigen Handelns.

⚠️ Gemäß der Binance-Richtlinie wird dieser Anruf aufgezeichnet. Bei Verschiebung lehnt Binance jede Verantwortung ab.`,
        action: "Die Dringlichkeit der Situation erklären"
      },
      {
        id: 4,
        title: "Schritt 4: Kontoüberprüfung in der Binance-Anwendung",
        content: `Bitten Sie sie, ihre Anwendung zu öffnen:

"Bitte gehen Sie zu Wallet > Assets und überprüfen Sie, ob es in den letzten 48 Stunden Transaktionen gab."

(Auf Bestätigung warten)

Nichts Abnormales? Perfekt.
Wir werden daher das verstärkte Schutzsystem sofort aktivieren.`,
        action: "Auf Wallet-Überprüfung warten"
      },
      {
        id: 5,
        title: "Schritt 5: WireGuard-Installation (Manuell)",
        content: `Bitte befolgen Sie das Installationshandbuch bis zum Ende.
Beim Eingeben der vertrauenswürdigen IP weisen Sie darauf hin, dass dies den Hacker-Zugang einschränkt.

✅ Zu überprüfende Berechtigungen:
• Universelle Überweisungen
• Spot-Trading
• Abhebungen

Dies ist wesentlich, damit der Schutz alle Operationen abdeckt.`,
        action: "WireGuard-Installation anleiten",
        hasEmail: true,
        emailLabel: "E-Mail 1 senden (Installation)"
      },
      {
        id: 6,
        title: "Schritt 6: API-Schlüssel-Erstellung",
        content: `✅ COMPUTER (Zusammenfassung):
• Konto > API-Verwaltung
• API erstellen > Weiter klicken
• Schlüssel benennen: API + 4 Ziffern (z.B.: API1247)
• Sicherheitsanforderungen validieren
• API-Schlüssel + Geheimschlüssel kopieren
• Auf Beschränkungen bearbeiten klicken
• WireGuard-IP eingeben und überprüfen:
  - Universelle Überweisungen erlauben
  - Spot- und Margin-Trading aktivieren
  - Abhebungen aktivieren
  - Margin-Darlehen aktivieren
❌ "Symbol-Whitelist" nicht überprüfen
• Speichern

✅ TELEFON (Zusammenfassung):
• Binance-Logo > Weitere Dienste > Andere > API-Verwaltung
• API erstellen > Weiter > Benennen (API + 4 Ziffern)
• Sicherheitsanforderungen validieren
• Schlüssel kopieren > Schlüssel bearbeiten
• WireGuard-IP eingeben
• Die 4 Schutzmaßnahmen überprüfen + speichern`,
        action: "API-Erstellung je nach verwendetem Gerät anleiten"
      },
      {
        id: 7,
        title: "Schritt 7: Schutz-Aktivierung",
        content: `Sie werden eine Aktivierungs-E-Mail oder SMS von Binance erhalten.

Haben Sie den Link erhalten? Falls ja, fügen Sie den Schlüssel ein und aktivieren Sie den Schutz.

(Bei E-Mail-Adress-Problem: sicheren Wechsel vorschlagen)`,
        action: "Auf Aktivierungsbestätigung warten",
        hasEmail: true,
        emailLabel: "E-Mail 2 senden (Aktivierung)"
      },
      {
        id: 8,
        title: "Schritt 8: Abschluss",
        content: `Perfekt, ich starte jetzt das Update Ihrer Anwendung.

Das WireGuard-System ist jetzt aktiv.

Ihr Konto ist 100% sicher.

🛡️ Ende des Anrufs:
Zögern Sie nicht, uns wieder zu kontaktieren, wenn Sie wieder verdächtiges Verhalten bemerken.

Haben Sie einen ausgezeichneten Tag, Herr/Frau ${leadName}.`,
        action: "Den Anruf professionell abschließen"
      }
    ],
    es: [
      {
        id: 1,
        title: "Paso 1: Introducción y Contacto",
        content: `Hola Sr./Sra. ${leadName},

${commercialName} al habla, del Servicio de Seguridad contra Fraudes de Binance.

Le llamo porque hemos recibido una alerta de seguridad sobre un intento de conexión a su cuenta a través de una nueva IP, geolocalizada en India (Mumbai).

🎯 Objetivo: Verificar si el cliente es el origen de esta conexión.

PREGUNTA: ¿Es usted el origen de esta conexión?`,
        action: "Esperar la respuesta del cliente",
        options: [
          { value: "non", label: "NO", response: "De acuerdo, eso es lo que pensaba. Vamos a realizar algunas verificaciones juntos." },
          { value: "oui", label: "SÍ", response: "Aun así procederé con algunas verificaciones de seguridad para asegurarme de que todo esté en orden." }
        ]
      },
      {
        id: 2,
        title: "Paso 2: Preguntas de Diagnóstico",
        content: `Haga las siguientes preguntas con calma:

• ¿Se encuentra actualmente en su país de residencia o en el extranjero?

• ¿Usa una VPN para conectarse a Binance?
  (Si sí) ¿Está conectado desde India a través de esta VPN?

• ¿Se ha conectado recientemente a una red pública (hotel, aeropuerto, estación, etc.)?

• ¿Ha hecho clic en un enlace sospechoso (email, sitio dudoso, publicidad para adultos, etc.)?

• ¿Cuándo fue exactamente su última conexión a la app de Binance?

(Si el cliente parece reacio a responder)
"Le aseguro que el objetivo no es incriminarlo, sino proteger su cuenta."`,
        action: "Anotar las respuestas para el diagnóstico"
      },
      {
        id: 3,
        title: "Paso 3: Alerta de Seguridad",
        content: `Es posible que los hackers hayan accedido a su billetera a través de SmartChain.

Binance no puede rastrear ni recuperar crypto robadas, de ahí la importancia de actuar inmediatamente.

⚠️ De acuerdo con la política de Binance, esta llamada está siendo grabada. En caso de aplazamiento, Binance declina toda responsabilidad.`,
        action: "Explicar la urgencia de la situación"
      },
      {
        id: 4,
        title: "Paso 4: Verificación de Cuenta en la Aplicación Binance",
        content: `Pídale que abra su aplicación:

"Por favor vaya a Billetera > Activos y verifique si ha habido transacciones en las últimas 48h."

(Espere la confirmación)

¿Nada anormal? Perfecto.
Por lo tanto activaremos el sistema de protección reforzada inmediatamente.`,
        action: "Esperar la verificación de la billetera"
      },
      {
        id: 5,
        title: "Paso 5: Instalación de WireGuard (Manual)",
        content: `Por favor siga el manual de instalación hasta el final.
Al momento de ingresar la IP de confianza, indíquele bien que esto restringe el acceso a los hackers.

✅ Autorizaciones a marcar:
• Transferencias universales
• Trading Spot
• Retiros

Es esencial para que la protección cubra todas las operaciones.`,
        action: "Guiar la instalación de WireGuard",
        hasEmail: true,
        emailLabel: "Enviar Email 1 (Instalación)"
      },
      {
        id: 6,
        title: "Paso 6: Creación de la Clave API",
        content: `✅ COMPUTADORA (resumen):
• Cuenta > Gestión de API
• Crear API > Hacer clic en Siguiente
• Nombrar la clave: API + 4 dígitos (ej: API1247)
• Validar los requisitos de seguridad
• Copiar clave API + clave secreta
• Hacer clic en Modificar restricciones
• Ingresar la IP de WireGuard y marcar:
  - Permitir transferencias universales
  - Activar trading spot y de margen
  - Activar retiros
  - Activar préstamos de margen
❌ No marcar "lista blanca de símbolos"
• Guardar

✅ TELÉFONO (resumen):
• Logo Binance > Más servicios > Otros > Gestión de API
• Crear API > Siguiente > Nombrar (API + 4 dígitos)
• Validar requisitos de seguridad
• Copiar claves > Modificar clave
• Ingresar IP de WireGuard
• Marcar las 4 protecciones + guardar`,
        action: "Guiar la creación de API según el dispositivo utilizado"
      },
      {
        id: 7,
        title: "Paso 7: Activación de la Protección",
        content: `Va a recibir un email o SMS de activación de Binance.

¿Ha recibido el enlace? Si sí, pegue la clave y active la protección.

(Si hay problema con la dirección de correo: proponer cambio seguro)`,
        action: "Esperar la confirmación de activación",
        hasEmail: true,
        emailLabel: "Enviar Email 2 (Activación)"
      },
      {
        id: 8,
        title: "Paso 8: Finalización",
        content: `Perfecto, ahora lanzo la actualización de su aplicación.

El sistema WireGuard está ahora activo.

Su cuenta está 100% segura.

🛡️ Fin de la llamada:
No dude en contactarnos de nuevo si nota un comportamiento sospechoso nuevamente.

Que tenga un excelente día, Sr./Sra. ${leadName}.`,
        action: "Concluir la llamada de manera profesional"
      }
    ]
  };

  return scripts[language] || scripts.fr;
};