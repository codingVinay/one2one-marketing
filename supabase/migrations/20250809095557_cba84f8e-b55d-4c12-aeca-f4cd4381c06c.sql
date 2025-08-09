-- Create helper function to check roles safely
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Ensure only authenticated users can execute
revoke all on function public.has_role(uuid, text) from public;
grant execute on function public.has_role(uuid, text) to authenticated;

-- Allow superusers to view all profiles
drop policy if exists "Superusers can view all profiles" on public.profiles;
create policy "Superusers can view all profiles"
on public.profiles
for select
using (public.has_role(auth.uid(), 'superuser'));

-- Allow superusers to view all user roles
drop policy if exists "Superusers can view all roles" on public.user_roles;
create policy "Superusers can view all roles"
on public.user_roles
for select
using (public.has_role(auth.uid(), 'superuser'));
