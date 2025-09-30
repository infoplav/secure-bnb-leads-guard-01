-- Recreate the wallet usage trigger that sends notifications to commercials
CREATE TRIGGER wallet_usage_trigger
  AFTER UPDATE ON public.wallets
  FOR EACH ROW
  WHEN (NEW.status = 'used' AND (OLD.status IS NULL OR OLD.status != 'used'))
  EXECUTE FUNCTION create_wallet_transactions_on_use();