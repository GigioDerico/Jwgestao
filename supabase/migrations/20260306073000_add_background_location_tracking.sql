CREATE TABLE IF NOT EXISTS public.background_location_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL,
  lat NUMERIC(10, 7) NOT NULL,
  lng NUMERIC(10, 7) NOT NULL,
  accuracy_m NUMERIC(8, 2),
  speed_mps NUMERIC(8, 3),
  heading_deg NUMERIC(6, 2),
  source TEXT NOT NULL DEFAULT 'background',
  battery_level NUMERIC(4, 3),
  is_mock BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_location_points_user_captured_at
  ON public.background_location_points (user_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_background_location_points_captured_at
  ON public.background_location_points (captured_at);

ALTER TABLE public.background_location_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own background location points" ON public.background_location_points;
DROP POLICY IF EXISTS "Users can insert own background location points" ON public.background_location_points;

CREATE POLICY "Users can read own background location points"
  ON public.background_location_points FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own background location points"
  ON public.background_location_points FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

INSERT INTO public.app_settings (key, value)
VALUES
  ('location_tracking_enabled', 'false'),
  ('location_tracking_interval_sec', '300'),
  ('location_tracking_distance_m', '100'),
  ('location_tracking_retention_days', '60'),
  ('location_tracking_internal_user_ids', '')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.insert_background_location_points(p_points jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_idx INTEGER;
  v_item JSONB;
  v_inserted INTEGER := 0;
  v_retention_days INTEGER := 60;
  v_lat NUMERIC;
  v_lng NUMERIC;
  v_accuracy NUMERIC;
  v_speed NUMERIC;
  v_heading NUMERIC;
  v_battery NUMERIC;
  v_captured_at TIMESTAMPTZ;
  v_source TEXT;
  v_is_mock BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado'
      USING ERRCODE = '28000';
  END IF;

  IF p_points IS NULL OR jsonb_typeof(p_points) <> 'array' THEN
    RAISE EXCEPTION 'Payload inválido: esperado array JSON em p_points'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(NULLIF(value, '')::INTEGER, 60)
    INTO v_retention_days
  FROM public.app_settings
  WHERE key = 'location_tracking_retention_days';

  IF v_retention_days IS NULL OR v_retention_days < 1 OR v_retention_days > 365 THEN
    v_retention_days := 60;
  END IF;

  IF jsonb_array_length(p_points) = 0 THEN
    RETURN 0;
  END IF;

  FOR v_idx IN 0 .. jsonb_array_length(p_points) - 1 LOOP
    v_item := p_points -> v_idx;

    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'Payload inválido no índice %: item deve ser objeto', v_idx
        USING ERRCODE = '22023';
    END IF;

    BEGIN
      v_lat := (v_item->>'lat')::NUMERIC;
      v_lng := (v_item->>'lng')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Payload inválido no índice %: lat/lng devem ser numéricos', v_idx
        USING ERRCODE = '22023';
    END;

    IF v_lat < -90 OR v_lat > 90 OR v_lng < -180 OR v_lng > 180 THEN
      RAISE EXCEPTION 'Payload inválido no índice %: coordenadas fora do intervalo', v_idx
        USING ERRCODE = '22023';
    END IF;

    BEGIN
      v_captured_at := COALESCE((v_item->>'captured_at')::TIMESTAMPTZ, NOW());
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Payload inválido no índice %: captured_at inválido', v_idx
        USING ERRCODE = '22023';
    END;

    BEGIN
      v_accuracy := NULLIF(v_item->>'accuracy_m', '')::NUMERIC;
      v_speed := NULLIF(v_item->>'speed_mps', '')::NUMERIC;
      v_heading := NULLIF(v_item->>'heading_deg', '')::NUMERIC;
      v_battery := NULLIF(v_item->>'battery_level', '')::NUMERIC;
      v_is_mock := COALESCE((v_item->>'is_mock')::BOOLEAN, FALSE);
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Payload inválido no índice %: campos opcionais inválidos', v_idx
        USING ERRCODE = '22023';
    END;

    v_source := COALESCE(NULLIF(v_item->>'source', ''), 'background');

    INSERT INTO public.background_location_points (
      user_id,
      captured_at,
      lat,
      lng,
      accuracy_m,
      speed_mps,
      heading_deg,
      source,
      battery_level,
      is_mock
    )
    VALUES (
      v_user_id,
      v_captured_at,
      v_lat,
      v_lng,
      v_accuracy,
      v_speed,
      v_heading,
      v_source,
      v_battery,
      v_is_mock
    );

    v_inserted := v_inserted + 1;
  END LOOP;

  DELETE FROM public.background_location_points
  WHERE user_id = v_user_id
    AND captured_at < NOW() - make_interval(days => v_retention_days);

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_background_location_points(jsonb) TO authenticated;
