-- Restaura as contas desativadas pela migração de endurecimento sem trocar senhas.
update public.admins
set active = true, updated_at = now()
where active = false and password = 'admin123';

select email, name, role, active
from public.admins
order by created_at;
