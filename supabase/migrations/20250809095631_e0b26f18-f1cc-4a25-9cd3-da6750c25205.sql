-- Fix linter warning: set immutable search_path for functions
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer set search_path = 'public'
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Also set search_path explicitly for get_client_status to satisfy linter
create or replace function public.get_client_status(client_row public.clients)
returns text
language plpgsql
stable
set search_path = 'public'
as $function$
begin
  -- If client has a package assigned, they are active, otherwise inactive
  if client_row.package_id is not null then
    return 'active';
  else
    return 'inactive';
  end if;
end;
$function$;