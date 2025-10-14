-- Allow professors to insert user roles when creating students
CREATE POLICY "Professors can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'professor'::app_role));