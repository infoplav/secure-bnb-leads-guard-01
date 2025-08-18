# Frontend Integration Guide

## Updating Your React App to Use the Asterisk Gateway

### 1. Install SIP.js (if not already installed)
```bash
npm install sip.js
```

### 2. Update SipDialerV2.tsx

Replace the WebSocket approach with proper SIP.js integration:

```typescript
import * as SIP from 'sip.js';

const SipDialerV2: React.FC<SipDialerV2Props> = ({ commercial, onBack, onLogout }) => {
  const [userAgent, setUserAgent] = useState<SIP.UserAgent | null>(null);
  const [session, setSession] = useState<SIP.Session | null>(null);
  
  // Replace connectWebSocket with this:
  const connectSipAgent = async () => {
    try {
      const agent = new SIP.UserAgent({
        uri: `sip:${selectedExtension}@YOUR-GATEWAY-DOMAIN.com`,
        authorizationUsername: selectedExtension,
        authorizationPassword: 'trips',
        transportOptions: {
          server: 'wss://YOUR-GATEWAY-DOMAIN.com:8089/ws'
        },
        userAgentString: 'WebRTC-SIP-Client/1.0'
      });

      // Handle registration
      agent.delegate = {
        onConnect: () => {
          console.log('SIP Agent connected');
          setCallState('registered');
          toast.success('SIP registration successful');
        },
        onDisconnect: (error) => {
          console.error('SIP Agent disconnected:', error);
          setCallState('failed');
          toast.error('SIP registration failed');
        }
      };

      await agent.start();
      setUserAgent(agent);
      
    } catch (error) {
      console.error('SIP registration error:', error);
      toast.error('Failed to connect to SIP server');
      setCallState('failed');
    }
  };

  // Replace startCall with this:
  const startCall = async () => {
    if (!userAgent || !phoneNumber.trim()) {
      toast.error('Please ensure SIP is registered and enter a phone number');
      return;
    }

    try {
      const target = SIP.UserAgent.makeURI(`sip:${phoneNumber}@YOUR-GATEWAY-DOMAIN.com`);
      if (!target) throw new Error('Invalid phone number');

      const inviter = new SIP.Inviter(userAgent, target, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });

      // Handle call events
      inviter.delegate = {
        onBye: () => {
          setCallState('ended');
          setSession(null);
          toast.info('Call ended');
        },
        onCancel: () => {
          setCallState('ended');
          setSession(null);
          toast.info('Call cancelled');
        },
        onReject: () => {
          setCallState('failed');
          setSession(null);
          toast.error('Call rejected');
        }
      };

      // Set up remote audio
      inviter.stateChange.addListener((newState) => {
        switch (newState) {
          case SIP.SessionState.Establishing:
            setCallState('calling');
            break;
          case SIP.SessionState.Established:
            setCallState('connected');
            // Handle remote audio stream
            const remoteStream = inviter.sessionDescriptionHandler?.remoteMediaStream;
            if (remoteStream && remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream;
            }
            break;
          case SIP.SessionState.Terminated:
            setCallState('ended');
            setSession(null);
            break;
        }
      });

      // Log call start to Supabase
      await fetch(`https://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/webrtc-sip-gateway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'call_start',
          extension: selectedExtension,
          target_number: phoneNumber,
          call_id: inviter.id
        })
      });

      await inviter.invite();
      setSession(inviter);
      setCallState('calling');
      
    } catch (error) {
      console.error('Call failed:', error);
      toast.error('Failed to start call');
      setCallState('failed');
    }
  };

  // Replace endCall with this:
  const endCall = async () => {
    if (session) {
      await session.bye();
      
      // Log call end to Supabase
      await fetch(`https://lnokphjzmvdegutjpxhw.supabase.co/functions/v1/webrtc-sip-gateway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'call_end',
          extension: selectedExtension,
          target_number: phoneNumber,
          duration: callDuration
        })
      });
    }
    
    setSession(null);
    setCallState('registered');
  };

  // Update the connect button
  {callState === 'idle' && (
    <Button onClick={connectSipAgent} className="w-full">
      Connect & Register SIP
    </Button>
  )}
};
```

### 3. Environment Configuration

Create a `.env` file with your gateway domain:
```env
REACT_APP_SIP_GATEWAY_DOMAIN=your-gateway-domain.com
```

### 4. Production Checklist

- [ ] Deploy Asterisk gateway to your VPS
- [ ] Configure DNS A record pointing to your server
- [ ] Update `YOUR-GATEWAY-DOMAIN.com` in the code
- [ ] Test SIP registration from browser
- [ ] Test outbound calls
- [ ] Verify call logging in Supabase

### 5. Testing Commands

```javascript
// In browser console after deployment:
const testSip = new SIP.UserAgent({
  uri: 'sip:8203@your-gateway-domain.com',
  authorizationUsername: '8203',
  authorizationPassword: 'trips',
  transportOptions: {
    server: 'wss://your-gateway-domain.com:8089/ws'
  }
});

testSip.start();
```