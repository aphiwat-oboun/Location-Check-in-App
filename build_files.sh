echo "Starting Vercel Build Phase..."
python3 -m pip install -r requirements.txt
python3 manage.py collectstatic --noinput --clear
echo "Vercel Build Phase Completed Successfully!"
