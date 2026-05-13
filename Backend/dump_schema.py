import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smc_backend.config.settings.base')
django.setup()

from django.apps import apps

output = []
for app in apps.get_app_configs():
    if not app.name.startswith('smc_backend.apps'):
        continue
        
    for model in app.get_models():
        output.append(f"\nModel: {model.__name__} (App: {app.name})")
        
        # Primary Key
        pk = model._meta.pk
        output.append(f"  Primary Key: {pk.name} ({pk.get_internal_type()})")
        
        # Other Fields
        output.append("  Fields:")
        for field in model._meta.fields:
            if field != pk:
                rel = ""
                if field.is_relation:
                    rel = f" -> {field.related_model.__name__}" if field.related_model else ""
                output.append(f"    - {field.name}: {field.get_internal_type()}{rel}")
                
        # Many-to-Many Fields
        for field in model._meta.many_to_many:
            output.append(f"    - {field.name} (M2M): {field.get_internal_type()} -> {field.related_model.__name__}")

with open("schema_dump.txt", "w") as f:
    f.write("\n".join(output))
print("Schema dumped successfully.")
