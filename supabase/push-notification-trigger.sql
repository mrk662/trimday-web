-- 1. Kill the simple ping trigger so it doesn't fire twice
DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;

-- 2. Install the refined logic
CREATE OR REPLACE FUNCTION public.send_onesignal_notification()
RETURNS trigger AS $$
DECLARE
  shop_name TEXT;
BEGIN
  -- ONLY proceed if the status is 'pending'
  IF NEW.status = 'pending' THEN
    
    -- ONLY fire if it's a new 'pending' row OR an update FROM 'unverified'
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status = 'unverified') THEN

      SELECT name INTO shop_name FROM public.shops WHERE id = NEW.shop_id;

      PERFORM net.http_post(
        url := 'https://onesignal.com/api/v1/notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Key os_v2_app_v7c54tbin5dzjmxlvqzw5qcy4j7gdm36daie6lnlrrmyii64vppszus3julnvn3rin3nethsb73ao72fklbr6v7vlxil2p54qlrj3ma'
        ),
        body := jsonb_build_object(
          'app_id', 'afc5de4c-286f-4794-b2eb-ac336ec058e2',
          'included_segments', jsonb_build_array('Total Subscriptions'),
          'headings', jsonb_build_object('en', 'Confirmed: ' || NEW.client_name || ' ✂️'),
          'contents', jsonb_build_object('en', NEW.client_name || ' just confirmed their ' || NEW.service_name || ' appointment!')
        )
      );

    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the refined trigger
DROP TRIGGER IF EXISTS one_signal_notification_trigger ON public.bookings;
CREATE TRIGGER one_signal_notification_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.send_onesignal_notification();