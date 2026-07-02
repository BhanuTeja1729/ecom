import { useEffect, useState, useRef } from 'react';
import { useRouter } from '../lib/router';
import { paymentApi } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { Check, XCircle, AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';

export function CheckoutVerify() {
  const { query, navigate } = useRouter();
  const { clearCart } = useCart();
  const { toast } = useToast();
  const orderId = query.get('order_id');
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setStatus('failed');
      setErrorMsg('No order ID found in verification link.');
      return;
    }

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    async function verifyPayment() {
      try {
        const res = await paymentApi.verifyCashfree(orderId as string);
        if (res.data?.success || res.success) {
          clearCart();
          setStatus('success');
          toast('Payment verified successfully!', 'success');
        } else {
          setStatus('failed');
          setErrorMsg(res.data?.message || 'Payment verification failed.');
        }
      } catch (err: any) {
        setStatus('failed');
        setErrorMsg(err.message || 'An error occurred during verification.');
      }
    }

    verifyPayment();
  }, [orderId, clearCart, toast]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10" />

        {status === 'verifying' && (
          <div className="py-8">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-amber-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Verifying Payment</h1>
            <p className="text-gray-500 text-sm">Please wait while we confirm your payment transaction with Cashfree. Do not close or refresh this page.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Check className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">Payment Confirmed!</h1>
            <p className="text-gray-500 text-sm mb-6">Your payment has been successfully processed and your order is confirmed.</p>
            
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-8">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Order Number</p>
              <p className="text-2xl font-black text-amber-600 tracking-wide">{orderId}</p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate(`/order-tracking?order=${orderId}`)} 
                className="w-full py-4 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-200"
              >
                Track Your Order
              </button>
              <button 
                onClick={() => navigate('/shop')} 
                className="w-full py-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="py-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-500 text-sm mb-6 text-red-600 font-medium">
              {errorMsg || 'We could not verify your online payment.'}
            </p>

            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-left mb-8 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-800">What went wrong?</p>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  The payment transaction was either cancelled, timed out, or failed. You can safely try checking out again or change your payment method.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => navigate('/checkout')} 
                className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retry Checkout
              </button>
              <button 
                onClick={() => navigate('/shop')} 
                className="w-full py-4 border border-gray-200 text-gray-700 font-bold rounded-xl hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Go to Shop
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
