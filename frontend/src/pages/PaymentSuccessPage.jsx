import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [paymentData, setPaymentData] = useState(null);

  const checkPaymentStatus = useCallback(async (attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('error');
      return;
    }

    try {
      const res = await axios.get(`${API}/api/payments/status/${sessionId}`);
      setPaymentData(res.data);
      
      if (res.data.payment_status === 'paid') {
        setStatus('success');
        return;
      } else if (res.data.status === 'expired') {
        setStatus('error');
        return;
      }

      // Continue polling
      setTimeout(() => checkPaymentStatus(attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (attempts < maxAttempts - 1) {
        setTimeout(() => checkPaymentStatus(attempts + 1), pollInterval);
      } else {
        setStatus('error');
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    } else {
      setStatus('error');
    }
  }, [sessionId, checkPaymentStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Processing Payment...
            </h1>
            <p className="text-slate-400">
              Please wait while we confirm your payment
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2" data-testid="success-title">
              Payment Successful!
            </h1>
            <p className="text-slate-400 mb-6">
              Thank you for subscribing to StatMoose {paymentData?.package_id?.includes('pro') ? 'Pro' : 'Basic'}.
              Your subscription is now active.
            </p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="go-to-dashboard-btn"
            >
              Go to Dashboard
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2" data-testid="error-title">
              Payment Issue
            </h1>
            <p className="text-slate-400 mb-6">
              We could not confirm your payment. If you were charged, please contact support.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/pricing')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                data-testid="try-again-btn"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white"
              >
                Back to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
