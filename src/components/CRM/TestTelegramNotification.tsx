import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const TestTelegramNotification = () => {
  const [isSending, setIsSending] = useState(false);

  const handleTestNotification = async () => {
    setIsSending(true);
    try {
      const testMessage = `🧪 <b>Test Notification</b>

This is a test message to verify both admin accounts receive transaction alerts.

⏰ <b>Time:</b> ${new Date().toLocaleString()}
✅ <b>Status:</b> System operational`;

      const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          message: testMessage,
          chat_ids: ['1889039543', '5433409472'] // Both admin chat IDs
        }
      });

      if (error) {
        console.error('Error sending test notification:', error);
        toast.error("Failed to send test notification");
      } else {
        console.log('Test notification sent:', data);
        toast.success("Test notification sent to both admins!");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to send test notification");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Telegram Notifications</CardTitle>
        <CardDescription>
          Send a test message to both admin Telegram accounts to verify transaction alerts are working
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleTestNotification}
          disabled={isSending}
          className="w-full"
        >
          {isSending ? (
            "Sending Test..."
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Test Notification to Both Admins
            </>
          )}
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          This will send a test message to chat IDs: 1889039543 and 5433409472
        </p>
      </CardContent>
    </Card>
  );
};