import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <StyledWrapper>
      <button className="Btn" {...props}>
        {children}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .Btn {
    min-width: 130px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgb(15, 15, 15);
    border: none;
    color: white;
    font-weight: 600;
    gap: 8px;
    cursor: pointer;
    box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.103);
    position: relative;
    overflow: hidden;
    transition-duration: .3s;
    padding: 0 16px;
  }

  .Btn svg {
    width: 16px;
    fill: white;
  }

  .Btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .Btn::before {
    width: 100%;
    height: 130px;
    position: absolute;
    content: "";
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    left: -100%;
    top: 0;
    transition-duration: .3s;
  }

  .Btn:hover:not(:disabled)::before {
    transition-duration: .3s;
    transform: translate(100%,-50%);
    border-radius: 0;
  }

  .Btn:active:not(:disabled) {
    transform: translate(5px,5px);
    transition-duration: .3s;
  }
`;

export default Button;
