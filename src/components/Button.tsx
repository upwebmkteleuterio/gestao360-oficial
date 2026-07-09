import React from 'react';
import styled from 'styled-components';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
}

const Button = ({ children, onClick, type = 'button', className, disabled }: ButtonProps) => {
  return (
    <StyledWrapper className={className}>
      <button className="Btn" onClick={onClick} type={type} disabled={disabled}>
        {children}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: inline-block;

  .Btn {
    width: 140px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgb(15, 15, 15);
    border: none;
    color: white;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    gap: 8px;
    cursor: pointer;
    box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.103);
    position: relative;
    overflow: hidden;
    transition-duration: .3s;
    border-radius: 4px;
  }

  .Btn svg {
    width: 14px;
    fill: white;
  }

  .Btn::before {
    width: 140px;
    height: 140px;
    position: absolute;
    content: "";
    background-color: white;
    border-radius: 50%;
    left: -100%;
    top: 0;
    transition-duration: .3s;
    mix-blend-mode: difference;
  }

  .Btn:hover::before {
    transition-duration: .3s;
    transform: translate(100%,-50%);
    border-radius: 0;
  }

  .Btn:active {
    transform: translate(2px,2px);
    transition-duration: .3s;
  }

  .Btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(1);
  }
`;

export default Button;
