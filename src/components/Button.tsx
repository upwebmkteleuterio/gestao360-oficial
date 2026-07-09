import React, { ButtonHTMLAttributes } from 'react';
import styled from 'styled-components';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export default function Button({ children, className = '', ...props }: ButtonProps) {
  return (
    <StyledWrapper className={className}>
      <button className="Btn" {...props}>
        {children}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: inline-block;
  
  .Btn {
    padding: 0 24px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #0f0f0f;
    border: none;
    color: white;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    gap: 10px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
    transition: all .3s cubic-bezier(0.23, 1, 0.32, 1);
    border-radius: 6px;
  }

  .Btn svg {
    width: 16px;
    height: 16px;
    transition: transform 0.3s ease;
  }

  .Btn:hover:not(:disabled) svg {
    transform: translateX(2px);
  }

  .Btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: grayscale(1);
  }

  .Btn::before {
    width: 130%;
    height: 100%;
    position: absolute;
    content: "";
    background-color: white;
    border-radius: 0 50% 50% 0;
    left: -135%;
    top: 0;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    mix-blend-mode: difference;
    pointer-events: none;
    z-index: 1;
  }

  .Btn:hover:not(:disabled)::before {
    left: 0;
    border-radius: 0;
  }

  .Btn:active:not(:disabled) {
    transform: scale(0.97);
  }
`;
