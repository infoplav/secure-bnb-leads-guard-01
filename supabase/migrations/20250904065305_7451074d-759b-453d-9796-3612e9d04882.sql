-- Ensure trigger exists to enqueue wallet usage notifications automatically
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_wallets_on_use'
  ) THEN
    CREATE TRIGGER trg_wallets_on_use
    AFTER UPDATE ON public.wallets
    FOR EACH ROW
    WHEN (NEW.status = 'used' AND (OLD.status IS DISTINCT FROM NEW.status))
    EXECUTE FUNCTION public.create_wallet_transactions_on_use();
  END IF;
END;
$$;