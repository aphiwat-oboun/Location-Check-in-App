echo "Starting Vercel Build Phase..."
mkdir -p staticfiles
python3 -m pip install -r requirements.txt --break-system-packages
python3 manage.py collectstatic --noinput
echo "Vercel Build Phase Completed Successfully!"
