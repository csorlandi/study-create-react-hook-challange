import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      const stock = await api.get<Stock>(`stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const updatedAmount = currentAmount + 1;

      if (stockAmount < updatedAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        updatedCart.forEach((product, index) => {
          if (product.id === productId) updatedCart[index].amount = updatedAmount
        })
      } else {
        const productInfo = await api.get<Product>(`products/${productId}`);

        const newProduct = {
          ...productInfo.data,
          amount: 1,
        };
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = cart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get<Stock>(`stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (stockAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart[productIndex].amount = amount;

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
