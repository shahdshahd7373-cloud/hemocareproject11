
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('doctor', 'patient', 'admin');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  blood_type TEXT,
  gender TEXT,
  notes TEXT,
  language TEXT NOT NULL DEFAULT 'ar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users delete own profile" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- Doctor-Patient relationship
CREATE TABLE public.doctor_patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, patient_id)
);

ALTER TABLE public.doctor_patients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_my_patient(_doctor_id UUID, _patient_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctor_patients WHERE doctor_id = _doctor_id AND patient_id = _patient_id
  )
$$;

CREATE POLICY "Doctor sees own links" ON public.doctor_patients
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id OR auth.uid() = patient_id);
CREATE POLICY "Doctor inserts own links" ON public.doctor_patients
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Doctor deletes own links" ON public.doctor_patients
  FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- Doctors can view patients' profiles
CREATE POLICY "Doctor views patient profile" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_my_patient(auth.uid(), id));

-- Medications
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescribed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  description TEXT,
  timing TEXT NOT NULL DEFAULT 'morning', -- morning | afternoon | evening | night
  meal_relation TEXT NOT NULL DEFAULT 'before', -- before | after | with | none
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient sees own meds" ON public.medications
  FOR SELECT TO authenticated USING (auth.uid() = patient_id OR public.is_my_patient(auth.uid(), patient_id));
CREATE POLICY "Doctor inserts meds" ON public.medications
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = prescribed_by AND public.is_my_patient(auth.uid(), patient_id)
  );
CREATE POLICY "Patient self meds insert" ON public.medications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctor updates meds" ON public.medications
  FOR UPDATE TO authenticated USING (auth.uid() = prescribed_by OR auth.uid() = patient_id);
CREATE POLICY "Doctor deletes meds" ON public.medications
  FOR DELETE TO authenticated USING (auth.uid() = prescribed_by OR auth.uid() = patient_id);

-- Lab tests
CREATE TABLE public.lab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own labs" ON public.lab_tests
  FOR SELECT TO authenticated USING (auth.uid() = patient_id OR public.is_my_patient(auth.uid(), patient_id));
CREATE POLICY "Insert labs (self or doctor)" ON public.lab_tests
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = patient_id OR public.is_my_patient(auth.uid(), patient_id)
  );
CREATE POLICY "Update labs" ON public.lab_tests
  FOR UPDATE TO authenticated USING (auth.uid() = patient_id OR public.is_my_patient(auth.uid(), patient_id));
CREATE POLICY "Delete labs" ON public.lab_tests
  FOR DELETE TO authenticated USING (auth.uid() = patient_id OR public.is_my_patient(auth.uid(), patient_id));

-- Glucose readings
CREATE TABLE public.glucose_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  reading_type TEXT NOT NULL DEFAULT 'fasting', -- fasting | before_meal | after_meal | random
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.glucose_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own glucose" ON public.glucose_readings
  FOR SELECT TO authenticated USING (auth.uid() = patient_id OR public.is_my_patient(auth.uid(), patient_id));
CREATE POLICY "Insert own glucose" ON public.glucose_readings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Delete own glucose" ON public.glucose_readings
  FOR DELETE TO authenticated USING (auth.uid() = patient_id);

-- Appointments
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL DEFAULT '09:00',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | completed | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own appts" ON public.appointments
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id OR auth.uid() = patient_id);
CREATE POLICY "Doctor inserts appts" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id AND public.is_my_patient(auth.uid(), patient_id));
CREATE POLICY "Doctor updates appts" ON public.appointments
  FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Doctor deletes appts" ON public.appointments
  FOR DELETE TO authenticated USING (auth.uid() = doctor_id);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own chat" ON public.chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own chat" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own chat" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'language', 'ar')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'::app_role)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
