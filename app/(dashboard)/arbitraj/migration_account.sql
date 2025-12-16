-- Create Profiles table for User Specific Settings
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  department text,
  phone text,
  theme_preference text DEFAULT 'dark',
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Add Company Info to factory_settings (JSONB for flexibility like notifications)
ALTER TABLE factory_settings 
ADD COLUMN IF NOT EXISTS company_info jsonb DEFAULT '{
  "name": "Şirketim A.Ş.",
  "tax_office": "",
  "tax_number": "",
  "address": "",
  "phone": "",
  "email": "",
  "website": ""
}'::jsonb;
